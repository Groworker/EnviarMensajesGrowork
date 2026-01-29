import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { Client } from '../../entities/client.entity';
import { ClientSendSettings } from '../../entities/client-send-settings.entity';
import { ZohoModule } from '../../zoho/zoho.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Client, ClientSendSettings]),
    ZohoModule,
  ],
  controllers: [ClientsController],
  providers: [ClientsService],
})
export class ClientsModule {}
