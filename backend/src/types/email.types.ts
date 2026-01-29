/**
 * Type definitions for Email service
 */

import { Readable } from 'stream';

export interface EmailMessage {
  to: string;
  from: string;
  subject: string;
  html: string;
}

export interface EmailSendInfo {
  message: Buffer | Readable | string;
  messageId?: string;
}

export interface GmailSendResponse {
  id: string;
  threadId: string;
}
