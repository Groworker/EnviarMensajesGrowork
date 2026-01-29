import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulerService } from './scheduler.service';
import { SchedulerController } from './scheduler.controller';
import { Client } from '../entities/client.entity';
import { ClientSendSettings } from '../entities/client-send-settings.entity';
import { SendJob } from '../entities/send-job.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Client, ClientSendSettings, SendJob])],
  controllers: [SchedulerController],
  providers: [SchedulerService],
})
export class SchedulerModule {}
