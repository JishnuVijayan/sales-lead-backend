import { Controller, Get, Post, Body, Patch, Param, Delete, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { CreateLeadDto, UpdateLeadDto, QualifyLeadDto, FilterLeadsDto } from './dto/lead.dto';

@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createLeadDto: CreateLeadDto) {
    return this.leadsService.create(createLeadDto);
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

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.leadsService.remove(id);
  }
}
