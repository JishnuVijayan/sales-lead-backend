import { Controller, Get, Post, Body, Patch, Param, Delete, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { NegotiationsService } from './negotiations.service';
import { CreateNegotiationDto, UpdateNegotiationDto } from './dto/negotiation.dto';
import { NegotiationOutcome } from '../../entities';

@Controller('negotiations')
export class NegotiationsController {
  constructor(private readonly negotiationsService: NegotiationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createNegotiationDto: CreateNegotiationDto) {
    return this.negotiationsService.create(createNegotiationDto);
  }

  @Get()
  findAll(@Query('leadId') leadId?: string) {
    return this.negotiationsService.findAll(leadId);
  }

  @Get('stats/:leadId')
  getNegotiationStats(@Param('leadId') leadId: string) {
    return this.negotiationsService.getNegotiationStats(leadId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.negotiationsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateNegotiationDto: UpdateNegotiationDto) {
    return this.negotiationsService.update(id, updateNegotiationDto);
  }

  @Patch(':id/complete')
  @HttpCode(HttpStatus.OK)
  completeNegotiation(
    @Param('id') id: string,
    @Body() body: { outcome: NegotiationOutcome; finalAmount?: number }
  ) {
    return this.negotiationsService.completeNegotiation(id, body.outcome, body.finalAmount);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.negotiationsService.remove(id);
  }
}