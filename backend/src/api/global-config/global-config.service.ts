import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GlobalSendConfig } from '../../entities/global-send-config.entity';
import { UpdateGlobalConfigDto } from './dto/update-global-config.dto';

@Injectable()
export class GlobalConfigService {
    private readonly logger = new Logger(GlobalConfigService.name);

    constructor(
        @InjectRepository(GlobalSendConfig)
        private configRepository: Repository<GlobalSendConfig>,
    ) { }

    async getConfig(): Promise<GlobalSendConfig> {
        let config = await this.configRepository.findOne({ where: { id: 1 } });

        // Create default if doesn't exist
        if (!config) {
            this.logger.log('No config found, creating default...');
            config = this.configRepository.create({
                id: 1,
                startHour: 9,
                endHour: 18,
                minDelayMinutes: 2,
                maxDelayMinutes: 5,
                enabled: true,
            });
            await this.configRepository.save(config);
        }

        return config;
    }

    async updateConfig(
        dto: UpdateGlobalConfigDto,
    ): Promise<GlobalSendConfig> {
        const config = await this.getConfig();

        // Validate end hour > start hour
        const newStartHour = dto.startHour ?? config.startHour;
        const newEndHour = dto.endHour ?? config.endHour;
        if (newEndHour <= newStartHour) {
            throw new Error('End hour must be greater than start hour');
        }

        // Validate max delay >= min delay
        const newMinDelay = dto.minDelayMinutes ?? config.minDelayMinutes;
        const newMaxDelay = dto.maxDelayMinutes ?? config.maxDelayMinutes;
        if (newMaxDelay < newMinDelay) {
            throw new Error('Max delay must be greater than or equal to min delay');
        }

        // Apply updates
        Object.assign(config, dto);
        const updated = await this.configRepository.save(config);

        this.logger.log(
            `Global config updated: ${JSON.stringify(updated, null, 2)}`,
        );

        return updated;
    }
}
