import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Logger,
} from '@nestjs/common';
import { DominiosService } from './dominios.service';
import { CreateDominioDto, UpdateDominioDto } from './dto';

@Controller('dominios')
export class DominiosController {
  private readonly logger = new Logger(DominiosController.name);

  constructor(private readonly dominiosService: DominiosService) {}

  @Get()
  async findAll() {
    this.logger.log('GET /dominios');
    return this.dominiosService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`GET /dominios/${id}`);
    return this.dominiosService.findOne(id);
  }

  @Post()
  async create(@Body() createDominioDto: CreateDominioDto) {
    this.logger.log(`POST /dominios - Creating: ${createDominioDto.dominio}`);
    return this.dominiosService.create(createDominioDto);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDominioDto: UpdateDominioDto,
  ) {
    this.logger.log(`PUT /dominios/${id}`);
    return this.dominiosService.update(id, updateDominioDto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`DELETE /dominios/${id}`);
    await this.dominiosService.remove(id);
    return { message: 'Dominio deleted successfully' };
  }
}
