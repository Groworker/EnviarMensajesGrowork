/**
 * Represents a file from Google Drive
 */
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
}

/**
 * Represents an email attachment ready to be sent
 */
export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}
