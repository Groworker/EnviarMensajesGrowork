import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Dominio } from '../entities/dominio.entity';
import { Client } from '../entities/client.entity';
import { DominiosService } from './dominios.service';
import { DominiosController } from './dominios.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Dominio, Client])],
  controllers: [DominiosController],
  providers: [DominiosService],
  exports: [DominiosService],
})
export class DominiosModule {}
