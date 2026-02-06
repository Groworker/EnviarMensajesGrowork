import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, drive_v3 } from 'googleapis';
import { DriveFile, EmailAttachment } from './interfaces/drive-file.interface';
import { Client } from '../entities/client.entity';
import { createGoogleAuth } from '../common/utils/google-auth.util';
import { AttachmentCacheService } from './attachment-cache.service';

@Injectable()
export class DriveService {
  private readonly logger = new Logger(DriveService.name);

  constructor(
    private configService: ConfigService,
    private cacheService: AttachmentCacheService,
  ) {}

  /**
   * Creates an authenticated Google Drive client
   */
  private async getDriveClient(): Promise<drive_v3.Drive> {
    const auth = createGoogleAuth({
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    return google.drive({ version: 'v3', auth });
  }

  /**
   * Lists all PDF files in a Google Drive folder
   * @param folderId - The Google Drive folder ID
   * @returns Array of files with their metadata
   */
  async getFilesFromFolder(folderId: string): Promise<DriveFile[]> {
    try {
      const drive = await this.getDriveClient();

      // Query for PDF files in the specified folder
      const response = await drive.files.list({
        q: `'${folderId}' in parents and mimeType='application/pdf' and trashed=false`,
        fields: 'files(id, name, mimeType, size)',
        orderBy: 'name',
      });

      const files = response.data.files || [];

      this.logger.log(
        `Found ${files.length} PDF files in folder ${folderId}`,
      );

      return files.map((file) => ({
        id: file.id || '',
        name: file.name || 'unknown.pdf',
        mimeType: file.mimeType || 'application/pdf',
        size: file.size ? parseInt(file.size, 10) : undefined,
      }));
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Failed to list files from folder ${folderId}: ${error.message}`,
          error.stack,
        );
      } else {
        this.logger.error(
          `Failed to list files from folder ${folderId}:`,
          error,
        );
      }
      throw error;
    }
  }

  /**
   * Downloads a file from Google Drive as a Buffer
   * @param fileId - The Google Drive file ID
   * @returns The file content as a Buffer
   */
  async downloadFile(fileId: string): Promise<Buffer> {
    try {
      const drive = await this.getDriveClient();

      const response = await drive.files.get(
        {
          fileId,
          alt: 'media',
        },
        { responseType: 'arraybuffer' },
      );

      const buffer = Buffer.from(response.data as ArrayBuffer);

      this.logger.log(`Downloaded file ${fileId} (${buffer.length} bytes)`);

      return buffer;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Failed to download file ${fileId}: ${error.message}`,
          error.stack,
        );
      } else {
        this.logger.error(`Failed to download file ${fileId}:`, error);
      }
      throw error;
    }
  }

  /**
   * Gets all PDF attachments from a client's DEFINITIVA folder
   * Uses cache to avoid repeated downloads from Google Drive
   * @param client - The client entity with idCarpetaDefinitiva
   * @returns Array of attachments ready to be sent via email
   */
  async getAttachmentsForClient(client: Client): Promise<EmailAttachment[]> {
    const folderId = client.idCarpetaDefinitiva;

    if (!folderId) {
      this.logger.warn(
        `Client ${client.id} (${client.nombre} ${client.apellido}) has no DEFINITIVA folder configured`,
      );
      return [];
    }

    try {
      // Get list of PDF files in the folder
      const files = await this.getFilesFromFolder(folderId);

      if (files.length === 0) {
        this.logger.warn(
          `No PDF files found in DEFINITIVA folder for client ${client.id}`,
        );
        return [];
      }

      // Download each file and prepare as attachment
      const attachments: EmailAttachment[] = [];
      let cacheHits = 0;
      let cacheMisses = 0;

      for (const file of files) {
        try {
          // Check cache first
          const cachedAttachment = await this.cacheService.get(
            client.id,
            file.id,
          );

          if (cachedAttachment) {
            // Use cached version
            attachments.push(cachedAttachment);
            cacheHits++;
          } else {
            // Download from Google Drive
            const content = await this.downloadFile(file.id);
            const attachment: EmailAttachment = {
              filename: file.name,
              content,
              contentType: 'application/pdf',
            };

            // Store in cache for future use
            await this.cacheService.set(
              client.id,
              file.id,
              file.name,
              content,
              'application/pdf',
            );

            attachments.push(attachment);
            cacheMisses++;
          }
        } catch (downloadError) {
          this.logger.error(
            `Failed to download file ${file.name} for client ${client.id}, skipping`,
          );
          // Continue with other files even if one fails
        }
      }

      this.logger.log(
        `Prepared ${attachments.length} attachments for client ${client.id} (${client.nombre} ${client.apellido}) - Cache: ${cacheHits} hits, ${cacheMisses} misses`,
      );

      return attachments;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Failed to get attachments for client ${client.id}: ${error.message}`,
          error.stack,
        );
      } else {
        this.logger.error(
          `Failed to get attachments for client ${client.id}:`,
          error,
        );
      }
      // Return empty array instead of throwing to avoid blocking email sends
      return [];
    }
  }
}
