import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ZohoService } from './zoho.service';
import { ZohoSyncService } from './zoho-sync.service';
import { ZohoSyncController } from './zoho-sync.controller';
import { Client } from '../entities/client.entity';
import { Dominio } from '../entities/dominio.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Client, Dominio])],
  controllers: [ZohoSyncController],
  providers: [ZohoService, ZohoSyncService],
  exports: [ZohoService, ZohoSyncService],
})
export class ZohoModule {}
