import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DriveService } from './drive.service';
import { AttachmentCacheService } from './attachment-cache.service';

@Module({
  imports: [ConfigModule],
  providers: [DriveService, AttachmentCacheService],
  exports: [DriveService, AttachmentCacheService],
})
export class DriveModule {}
