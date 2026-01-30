import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailPreviewController } from './email-preview.controller';
import { EmailPreviewService } from './email-preview.service';
import { EmailSend } from '../../entities/email-send.entity';
import { EmailModule } from '../../email/email.module';
import { AiModule } from '../../ai/ai.module';
import { DriveModule } from '../../drive/drive.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmailSend]),
    EmailModule,
    AiModule,
    DriveModule,
  ],
  controllers: [EmailPreviewController],
  providers: [EmailPreviewService],
  exports: [EmailPreviewService],
})
export class EmailPreviewModule {}
