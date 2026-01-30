import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailResponsesController } from './email-responses.controller';
import { EmailResponsesService } from './email-responses.service';
import { EmailResponse } from '../../entities/email-response.entity';
import { EmailSend } from '../../entities/email-send.entity';
import { EmailModule } from '../../email/email.module';
import { AiModule } from '../../ai/ai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmailResponse, EmailSend]),
    EmailModule,
    AiModule,
  ],
  controllers: [EmailResponsesController],
  providers: [EmailResponsesService],
  exports: [EmailResponsesService],
})
export class EmailResponsesModule {}
