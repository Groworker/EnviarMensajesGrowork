import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { EmailAttachment } from './interfaces/drive-file.interface';

/**
 * Metadata for cached attachments (stored in memory)
 */
interface CacheMetadata {
  clientId: number;
  fileId: string;
  filename: string;
  filePath: string;
  cachedAt: Date;
  size: number;
  contentType: string;
}

/**
 * Service for caching email attachments on disk
 * Uses filesystem storage to minimize RAM usage
 */
@Injectable()
export class AttachmentCacheService {
  private readonly logger = new Logger(AttachmentCacheService.name);
  private readonly cacheDir: string;
  private readonly ttlMs: number; // Time to live in milliseconds
  private metadata = new Map<string, CacheMetadata>();

  constructor(private configService: ConfigService) {
    // Default cache directory
    this.cacheDir =
      this.configService.get<string>('ATTACHMENT_CACHE_DIR') ||
      '/app/cache/attachments';

    // Default TTL: 24 hours
    const ttlHours = this.configService.get<number>(
      'ATTACHMENT_CACHE_TTL_HOURS',
      24,
    );
    this.ttlMs = ttlHours * 60 * 60 * 1000;

    this.initializeCache();
  }

  /**
   * Initialize cache directory and load existing metadata
   */
  private initializeCache(): void {
    try {
      // Create cache directory if it doesn't exist
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true });
        this.logger.log(`Created cache directory: ${this.cacheDir}`);
      }

      // Scan existing files and rebuild metadata
      this.rebuildMetadataFromDisk();

      this.logger.log(
        `Cache initialized: ${this.metadata.size} files found, TTL: ${this.ttlMs / 1000 / 60 / 60}h`,
      );
    } catch (error) {
      this.logger.error('Failed to initialize cache', error);
    }
  }

  /**
   * Rebuild metadata map from existing files on disk
   */
  private rebuildMetadataFromDisk(): void {
    try {
      if (!fs.existsSync(this.cacheDir)) return;

      const clientDirs = fs
        .readdirSync(this.cacheDir)
        .filter((item) => item.startsWith('client_'));

      for (const clientDir of clientDirs) {
        const clientPath = path.join(this.cacheDir, clientDir);
        const stats = fs.statSync(clientPath);

        if (!stats.isDirectory()) continue;

        const clientId = parseInt(clientDir.replace('client_', ''));
        const files = fs.readdirSync(clientPath);

        for (const filename of files) {
          const filePath = path.join(clientPath, filename);
          const fileStats = fs.statSync(filePath);

          // Extract fileId from filename (format: fileId_originalname.pdf)
          const fileIdMatch = filename.match(/^([^_]+)_(.+)$/);
          if (!fileIdMatch) continue;

          const fileId = fileIdMatch[1];
          const key = this.getCacheKey(clientId, fileId);

          this.metadata.set(key, {
            clientId,
            fileId,
            filename: fileIdMatch[2],
            filePath,
            cachedAt: fileStats.mtime,
            size: fileStats.size,
            contentType: 'application/pdf',
          });
        }
      }
    } catch (error) {
      this.logger.warn('Failed to rebuild metadata from disk', error);
    }
  }

  /**
   * Generate cache key
   */
  private getCacheKey(clientId: number, fileId: string): string {
    return `${clientId}_${fileId}`;
  }

  /**
   * Check if cached file exists and is not expired
   */
  has(clientId: number, fileId: string): boolean {
    const key = this.getCacheKey(clientId, fileId);
    const meta = this.metadata.get(key);

    if (!meta) return false;

    // Check TTL
    const age = Date.now() - meta.cachedAt.getTime();
    if (age > this.ttlMs) {
      this.logger.debug(
        `Cache expired for client ${clientId}, file ${fileId} (age: ${age / 1000 / 60 / 60}h)`,
      );
      this.remove(clientId, fileId);
      return false;
    }

    // Check if file still exists on disk
    if (!fs.existsSync(meta.filePath)) {
      this.logger.warn(
        `Cache metadata exists but file missing: ${meta.filePath}`,
      );
      this.metadata.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Get cached attachment
   */
  async get(clientId: number, fileId: string): Promise<EmailAttachment | null> {
    if (!this.has(clientId, fileId)) {
      return null;
    }

    const key = this.getCacheKey(clientId, fileId);
    const meta = this.metadata.get(key)!;

    try {
      // Read file from disk
      const content = fs.readFileSync(meta.filePath);

      this.logger.debug(
        `Cache HIT: client ${clientId}, file ${fileId} (${meta.size} bytes)`,
      );

      return {
        filename: meta.filename,
        content,
        contentType: meta.contentType,
      };
    } catch (error) {
      this.logger.error(
        `Failed to read cached file: ${meta.filePath}`,
        error,
      );
      this.metadata.delete(key);
      return null;
    }
  }

  /**
   * Store attachment in cache
   */
  async set(
    clientId: number,
    fileId: string,
    filename: string,
    content: Buffer,
    contentType: string = 'application/pdf',
  ): Promise<void> {
    try {
      // Create client directory
      const clientDir = path.join(this.cacheDir, `client_${clientId}`);
      if (!fs.existsSync(clientDir)) {
        fs.mkdirSync(clientDir, { recursive: true });
      }

      // Save file with format: fileId_originalname.pdf
      const safeFilename = `${fileId}_${filename}`;
      const filePath = path.join(clientDir, safeFilename);

      // Write to disk
      fs.writeFileSync(filePath, content);

      // Store metadata in memory
      const key = this.getCacheKey(clientId, fileId);
      this.metadata.set(key, {
        clientId,
        fileId,
        filename,
        filePath,
        cachedAt: new Date(),
        size: content.length,
        contentType,
      });

      this.logger.debug(
        `Cache STORE: client ${clientId}, file ${fileId} (${content.length} bytes)`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to store file in cache: client ${clientId}, file ${fileId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Remove specific file from cache
   */
  remove(clientId: number, fileId: string): void {
    const key = this.getCacheKey(clientId, fileId);
    const meta = this.metadata.get(key);

    if (meta && fs.existsSync(meta.filePath)) {
      try {
        fs.unlinkSync(meta.filePath);
        this.logger.debug(`Removed cached file: ${meta.filePath}`);
      } catch (error) {
        this.logger.warn(`Failed to delete cached file: ${meta.filePath}`);
      }
    }

    this.metadata.delete(key);
  }

  /**
   * Clear cache for specific client
   */
  clearForClient(clientId: number): void {
    const clientDir = path.join(this.cacheDir, `client_${clientId}`);

    // Remove all metadata for this client
    const keysToDelete: string[] = [];
    this.metadata.forEach((meta, key) => {
      if (meta.clientId === clientId) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => this.metadata.delete(key));

    // Remove directory from disk
    if (fs.existsSync(clientDir)) {
      try {
        fs.rmSync(clientDir, { recursive: true, force: true });
        this.logger.log(`Cleared cache for client ${clientId}`);
      } catch (error) {
        this.logger.error(
          `Failed to clear cache directory for client ${clientId}`,
          error,
        );
      }
    }
  }

  /**
   * Clear entire cache
   */
  clearAll(): void {
    this.metadata.clear();

    if (fs.existsSync(this.cacheDir)) {
      try {
        // Remove all client directories
        const items = fs.readdirSync(this.cacheDir);
        items.forEach((item) => {
          const itemPath = path.join(this.cacheDir, item);
          if (fs.statSync(itemPath).isDirectory()) {
            fs.rmSync(itemPath, { recursive: true, force: true });
          }
        });
        this.logger.log('Cleared all cache');
      } catch (error) {
        this.logger.error('Failed to clear cache', error);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    totalFiles: number;
    totalSizeBytes: number;
    totalSizeMB: number;
    clientCount: number;
    oldestCacheDate: Date | null;
  } {
    let totalSize = 0;
    const clients = new Set<number>();
    let oldestDate: Date | null = null;

    this.metadata.forEach((meta) => {
      totalSize += meta.size;
      clients.add(meta.clientId);

      if (!oldestDate || meta.cachedAt < oldestDate) {
        oldestDate = meta.cachedAt;
      }
    });

    return {
      totalFiles: this.metadata.size,
      totalSizeBytes: totalSize,
      totalSizeMB: Math.round((totalSize / 1024 / 1024) * 100) / 100,
      clientCount: clients.size,
      oldestCacheDate: oldestDate,
    };
  }

  /**
   * Clean up expired cache entries
   */
  cleanupExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.metadata.forEach((meta, key) => {
      const age = now - meta.cachedAt.getTime();
      if (age > this.ttlMs) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => {
      const meta = this.metadata.get(key)!;
      this.remove(meta.clientId, meta.fileId);
    });

    if (keysToDelete.length > 0) {
      this.logger.log(`Cleaned up ${keysToDelete.length} expired cache entries`);
    }
  }
}
