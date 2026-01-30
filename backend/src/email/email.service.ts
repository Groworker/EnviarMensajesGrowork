import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import * as nodemailer from 'nodemailer';
import * as path from 'path';
import { EmailAttachment } from '../drive/interfaces/drive-file.interface';

export interface EmailSendResult {
  messageId: string;
  threadId: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) { }

  async sendEmail(
    to: string,
    subject: string,
    htmlContent: string,
    fromEmail: string, // The email to impersonate (e.g., client's corporate email)
    attachments?: EmailAttachment[], // Optional PDF attachments
  ): Promise<EmailSendResult> {
    try {
      // 1. Load Credentials
      // We expect a google-creds.json file in the root or config folder
      const keyFilePath = path.join(process.cwd(), 'google-creds.json');

      // 2. Create JWT Client with Domain-Wide Delegation
      const auth = new google.auth.GoogleAuth({
        keyFile: keyFilePath,
        scopes: ['https://www.googleapis.com/auth/gmail.send'],
        clientOptions: {
          subject: fromEmail,
        },
      });

      // Get authenticated client
      const authClient = await auth.getClient();

      // 3. Create Gmail API Client
      // Use auth directly instead of authClient to avoid type mismatch
      const gmail = google.gmail({ version: 'v1', auth: auth as any });

      // 4. Construct Raw Email (MIME) using standard Nodemailer API
      const transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
        buffer: true,
      });

      const sentInfo = await transporter.sendMail({
        to,
        from: fromEmail,
        subject,
        html: htmlContent,
        attachments: attachments?.map((att) => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType,
        })),
      });

      // message is a Buffer when buffer: true option is set
      const bufferMessage = sentInfo.message as Buffer;

      const rawMessage = bufferMessage
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      // 5. Send via Gmail API
      const res = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: rawMessage,
        },
      });

      const attachmentInfo = attachments?.length
        ? ` with ${attachments.length} attachment(s)`
        : '';
      this.logger.log(
        `Email sent from ${fromEmail} to ${to}${attachmentInfo}. ID: ${res.data.id}, ThreadID: ${res.data.threadId}`,
      );

      // Debug logging
      this.logger.debug(`Raw Gmail API response - id: ${res.data.id}, threadId: ${res.data.threadId}, labelIds: ${res.data.labelIds}`);

      if (!res.data.id || !res.data.threadId) {
        this.logger.warn(`⚠️ Email sent but missing ID or ThreadID! ID: ${res.data.id}, ThreadID: ${res.data.threadId}`);
        throw new Error('Email sent but no ID or ThreadID returned from Gmail API');
      }
      return {
        messageId: res.data.id,
        threadId: res.data.threadId,
      };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Failed to send email from ${fromEmail}: ${error.message}`,
          error.stack,
        );
      } else {
        this.logger.error(`Failed to send email from ${fromEmail}:`, error);
      }
      throw error;
    }
  }
}
