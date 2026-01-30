import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GlobalConfigController } from './global-config.controller';
import { GlobalConfigService } from './global-config.service';
import { GlobalSendConfig } from '../../entities/global-send-config.entity';

@Module({
    imports: [TypeOrmModule.forFeature([GlobalSendConfig])],
    controllers: [GlobalConfigController],
    providers: [GlobalConfigService],
    exports: [GlobalConfigService],
})
export class GlobalConfigModule { }
