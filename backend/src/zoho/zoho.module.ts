import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ZohoService } from './zoho.service';
import { ZohoSyncService } from './zoho-sync.service';
import { ZohoSyncController } from './zoho-sync.controller';
import { Client } from '../entities/client.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Client])],
  controllers: [ZohoSyncController],
  providers: [ZohoService, ZohoSyncService],
  exports: [ZohoService, ZohoSyncService],
})
export class ZohoModule {}
