import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { SLAService } from './sla.service';
import { CreateSLAConfigDto, UpdateSLAConfigDto } from './dto/sla-config.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';

@Controller('sla')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SLAController {
  constructor(private readonly slaService: SLAService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() createDto: CreateSLAConfigDto) {
    return this.slaService.create(createDto);
  }

  @Get()
  findAll() {
    return this.slaService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.slaService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() updateDto: UpdateSLAConfigDto) {
    return this.slaService.update(id, updateDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.slaService.remove(id);
  }

  @Post('initialize-defaults')
  @Roles(UserRole.ADMIN)
  initializeDefaults() {
    return this.slaService.initializeDefaultSLAs();
  }
}
