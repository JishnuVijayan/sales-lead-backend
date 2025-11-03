import { Controller, Get, Post, Body, Patch, Param, Delete, Query, HttpCode, HttpStatus, UseGuards, Request } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { CreateLeadDto, UpdateLeadDto, QualifyLeadDto, FilterLeadsDto } from './dto/lead.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('leads')
@UseGuards(JwtAuthGuard)
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createLeadDto: CreateLeadDto, @Request() req: any) {
    return this.leadsService.create(createLeadDto, req.user.id);
  }

  @Get()
  findAll(@Query() filterDto: FilterLeadsDto) {
    return this.leadsService.findAll(filterDto);
  }

  @Get('aging-summary')
  getAgingSummary() {
    return this.leadsService.getAgingSummary();
  }

  @Get('overdue')
  getOverdueLeads() {
    return this.leadsService.getOverdueLeads();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.leadsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateLeadDto: UpdateLeadDto) {
    return this.leadsService.update(id, updateLeadDto);
  }

  @Patch(':id/qualify')
  qualify(@Param('id') id: string, @Body() qualifyDto: QualifyLeadDto) {
    return this.leadsService.qualify(id, qualifyDto);
  }

  @Patch(':id/convert')
  @HttpCode(HttpStatus.OK)
  convertToWon(@Param('id') id: string) {
    return this.leadsService.convertToWon(id);
  }

  @Patch(':id/lost')
  @HttpCode(HttpStatus.OK)
  markAsLost(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.leadsService.markAsLost(id, reason);
  }

  @Patch(':id/move-to-proposal')
  @HttpCode(HttpStatus.OK)
  moveToProposal(@Param('id') id: string) {
    return this.leadsService.moveToProposal(id);
  }

  @Patch(':id/move-to-negotiation')
  @HttpCode(HttpStatus.OK)
  moveToNegotiation(@Param('id') id: string) {
    return this.leadsService.moveToNegotiation(id);
  }

  @Patch(':id/mark-dormant')
  @HttpCode(HttpStatus.OK)
  markAsDormant(@Param('id') id: string) {
    return this.leadsService.markAsDormant(id);
  }

  @Patch(':id/claim')
  @HttpCode(HttpStatus.OK)
  claim(@Param('id') id: string, @Body('userId') userId: string) {
    return this.leadsService.claim(id, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.leadsService.remove(id);
  }
}
