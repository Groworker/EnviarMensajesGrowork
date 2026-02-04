import {
    Controller,
    Get,
    Put,
    Body,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { GlobalConfigService } from './global-config.service';
import { UpdateGlobalConfigDto } from './dto/update-global-config.dto';

@Controller('global-config')
export class GlobalConfigController {
    private readonly logger = new Logger(GlobalConfigController.name);

    constructor(private readonly configService: GlobalConfigService) { }

    @Get()
    async getConfig() {
        try {
            return await this.configService.getConfig();
        } catch (error) {
            this.logger.error('Error fetching global config', error);
            throw new HttpException(
                'Failed to fetch config',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Put()
    async updateConfig(@Body() dto: UpdateGlobalConfigDto) {
        try {
            return await this.configService.updateConfig(dto);
        } catch (error: any) {
            this.logger.error('Error updating global config', error);
            throw new HttpException(
                error.message || 'Failed to update config',
                HttpStatus.BAD_REQUEST,
            );
        }
    }
}
