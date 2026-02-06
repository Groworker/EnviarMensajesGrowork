import { Injectable, Logger } from '@nestjs/common';
import { google, gmail_v1 } from 'googleapis';
import { createGoogleAuth } from '../common/utils/google-auth.util';

export interface GmailMessage {
  id: string;
  threadId: string;
  from: string;
  fromName: string | null;
  to: string;
  subject: string;
  bodyText: string | null;
  bodyHtml: string | null;
  receivedAt: Date;
  isReply: boolean;
  inReplyTo: string | null;
  references: string | null;
}

@Injectable()
export class GmailReaderService {
  private readonly logger = new Logger(GmailReaderService.name);

  /**
   * Create authenticated Gmail client for a specific user email
   */
  private async getGmailClient(userEmail: string): Promise<gmail_v1.Gmail> {
    const auth = createGoogleAuth({
      scopes: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.send',
      ],
      subject: userEmail,
    });

    return google.gmail({ version: 'v1', auth: auth as any });
  }

  /**
   * Get all messages in a specific thread
   */
  async getThreadMessages(
    userEmail: string,
    threadId: string,
  ): Promise<GmailMessage[]> {
    try {
      const gmail = await this.getGmailClient(userEmail);

      const thread = await gmail.users.threads.get({
        userId: 'me',
        id: threadId,
        format: 'full',
      });

      if (!thread.data.messages) {
        return [];
      }

      const messages: GmailMessage[] = [];

      for (const msg of thread.data.messages) {
        const parsed = this.parseMessage(msg);
        if (parsed) {
          messages.push(parsed);
        }
      }

      return messages;
    } catch (error) {
      this.logger.error(
        `Failed to get thread ${threadId} for ${userEmail}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Search for replies to sent emails since a specific date
   * Returns only messages that are replies (not the original sent messages)
   */
  async searchNewReplies(
    userEmail: string,
    sinceDate: Date,
  ): Promise<GmailMessage[]> {
    try {
      const gmail = await this.getGmailClient(userEmail);

      // Format date for Gmail query (YYYY/MM/DD)
      const dateStr = sinceDate.toISOString().split('T')[0].replace(/-/g, '/');

      // Search for messages in inbox (replies) after the specified date
      // that are in response to sent emails
      const query = `in:inbox after:${dateStr}`;

      const response = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 100,
      });

      if (!response.data.messages) {
        return [];
      }

      const messages: GmailMessage[] = [];

      for (const msgRef of response.data.messages) {
        try {
          const msgResponse = await gmail.users.messages.get({
            userId: 'me',
            id: msgRef.id!,
            format: 'full',
          });

          const parsed = this.parseMessage(msgResponse.data);
          if (parsed) {
            // Only include messages FROM external addresses (not sent by user)
            const fromLower = parsed.from.toLowerCase();
            const userLower = userEmail.toLowerCase();
            if (!fromLower.includes(userLower)) {
              parsed.isReply = true;
              messages.push(parsed);
            }
          }
        } catch (msgError) {
          this.logger.warn(
            `Failed to get message ${msgRef.id}: ${msgError.message}`,
          );
        }
      }

      return messages;
    } catch (error) {
      this.logger.error(
        `Failed to search replies for ${userEmail}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Get a single message by ID
   */
  async getMessage(
    userEmail: string,
    messageId: string,
  ): Promise<GmailMessage | null> {
    try {
      const gmail = await this.getGmailClient(userEmail);

      const response = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });

      return this.parseMessage(response.data);
    } catch (error) {
      this.logger.error(
        `Failed to get message ${messageId} for ${userEmail}: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * Parse a Gmail API message into our GmailMessage format
   */
  private parseMessage(msg: gmail_v1.Schema$Message): GmailMessage | null {
    if (!msg.id || !msg.threadId) {
      return null;
    }

    const headers = msg.payload?.headers || [];
    const getHeader = (name: string): string => {
      const header = headers.find(
        (h) => h.name?.toLowerCase() === name.toLowerCase(),
      );
      return header?.value || '';
    };

    const from = getHeader('From');
    const to = getHeader('To');
    const subject = getHeader('Subject');
    const date = getHeader('Date');
    const inReplyTo = getHeader('In-Reply-To');
    const references = getHeader('References');

    // Parse from address and name
    let fromEmail = from;
    let fromName: string | null = null;
    const fromMatch = from.match(/^(.+?)\s*<(.+?)>$/);
    if (fromMatch) {
      fromName = fromMatch[1].replace(/"/g, '').trim();
      fromEmail = fromMatch[2];
    }

    // Get body content
    const { bodyText, bodyHtml } = this.extractBody(msg.payload);

    // Parse date
    let receivedAt = new Date();
    if (date) {
      try {
        receivedAt = new Date(date);
      } catch {
        // Keep default
      }
    } else if (msg.internalDate) {
      receivedAt = new Date(parseInt(msg.internalDate, 10));
    }

    return {
      id: msg.id,
      threadId: msg.threadId,
      from: fromEmail,
      fromName,
      to,
      subject,
      bodyText,
      bodyHtml,
      receivedAt,
      isReply: false,
      inReplyTo: inReplyTo || null,
      references: references || null,
    };
  }

  /**
   * Extract body text and HTML from message payload
   */
  private extractBody(payload?: gmail_v1.Schema$MessagePart): {
    bodyText: string | null;
    bodyHtml: string | null;
  } {
    let bodyText: string | null = null;
    let bodyHtml: string | null = null;

    if (!payload) {
      return { bodyText, bodyHtml };
    }

    // Check if this part has body data
    if (payload.body?.data) {
      const decoded = Buffer.from(payload.body.data, 'base64').toString('utf-8');
      if (payload.mimeType === 'text/plain') {
        bodyText = decoded;
      } else if (payload.mimeType === 'text/html') {
        bodyHtml = decoded;
      }
    }

    // Recursively check parts
    if (payload.parts) {
      for (const part of payload.parts) {
        const { bodyText: partText, bodyHtml: partHtml } =
          this.extractBody(part);
        if (partText && !bodyText) {
          bodyText = partText;
        }
        if (partHtml && !bodyHtml) {
          bodyHtml = partHtml;
        }
      }
    }

    return { bodyText, bodyHtml };
  }

  /**
   * Check if a thread has new messages since last check
   */
  async hasNewMessagesInThread(
    userEmail: string,
    threadId: string,
    lastMessageId: string,
  ): Promise<boolean> {
    try {
      const messages = await this.getThreadMessages(userEmail, threadId);

      // Find the index of the last known message
      const lastIndex = messages.findIndex((m) => m.id === lastMessageId);

      // If not found or there are messages after it, there are new messages
      return lastIndex === -1 || lastIndex < messages.length - 1;
    } catch {
      return false;
    }
  }
}
