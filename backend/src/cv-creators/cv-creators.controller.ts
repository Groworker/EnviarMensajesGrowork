import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  Logger,
} from '@nestjs/common';
import { CvCreatorsService } from './cv-creators.service';
import { CreateCvCreatorDto, UpdateCvCreatorDto } from './dto';

@Controller('cv-creators')
export class CvCreatorsController {
  private readonly logger = new Logger(CvCreatorsController.name);

  constructor(private readonly cvCreatorsService: CvCreatorsService) {}

  @Get()
  async findAll(@Query('idioma') idioma?: string) {
    this.logger.log(`GET /cv-creators${idioma ? `?idioma=${idioma}` : ''}`);
    return this.cvCreatorsService.findAll(idioma);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`GET /cv-creators/${id}`);
    return this.cvCreatorsService.findOne(id);
  }

  @Post()
  async create(@Body() createCvCreatorDto: CreateCvCreatorDto) {
    this.logger.log(`POST /cv-creators - Creating: ${createCvCreatorDto.nombre}`);
    return this.cvCreatorsService.create(createCvCreatorDto);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCvCreatorDto: UpdateCvCreatorDto,
  ) {
    this.logger.log(`PUT /cv-creators/${id}`);
    return this.cvCreatorsService.update(id, updateCvCreatorDto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`DELETE /cv-creators/${id}`);
    await this.cvCreatorsService.remove(id);
    return { message: 'CV creator deleted successfully' };
  }
}
