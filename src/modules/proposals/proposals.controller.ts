import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  Res,
  UseGuards,
  Request,
} from '@nestjs/common';
import type { Response } from 'express';
import { ProposalsService } from './proposals.service';
import { CreateProposalDto, UpdateProposalDto } from './dto/proposal.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('proposals')
@UseGuards(JwtAuthGuard)
export class ProposalsController {
  constructor(private readonly proposalsService: ProposalsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createProposalDto: CreateProposalDto, @Request() req: any) {
    return this.proposalsService.create(createProposalDto, req.user.id);
  }

  @Get()
  findAll() {
    return this.proposalsService.findAll();
  }

  @Get('lead/:leadId')
  findByLead(@Param('leadId') leadId: string) {
    return this.proposalsService.findByLead(leadId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.proposalsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateProposalDto: UpdateProposalDto,
  ) {
    return this.proposalsService.update(id, updateProposalDto);
  }

  @Patch(':id/send')
  @HttpCode(HttpStatus.OK)
  markAsSent(@Param('id') id: string) {
    return this.proposalsService.markAsSent(id);
  }

  @Post(':id/version')
  @HttpCode(HttpStatus.CREATED)
  createNewVersion(@Param('id') id: string) {
    return this.proposalsService.createNewVersion(id);
  }

  @Get(':id/pdf')
  async generatePdf(
    @Param('id') id: string,
    @Res() res: Response,
    @Request() req: any,
  ) {
    const pdfBuffer = await this.proposalsService.generatePdf(id, req.user.id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="proposal-${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  }

  // Phase 2: Multi-level approval workflow
  @Post(':id/send-for-approval')
  @HttpCode(HttpStatus.OK)
  sendForApproval(@Param('id') id: string, @Request() req: any) {
    return this.proposalsService.sendForApproval(id, req.user.userId);
  }

  @Get(':id/approval-status')
  checkApprovalStatus(@Param('id') id: string) {
    return this.proposalsService.checkApprovalStatus(id);
  }

  @Post(':id/return-to-creator')
  @UseGuards(JwtAuthGuard)
  returnToCreator(
    @Param('id') id: string,
    @Body() body: { reason: string },
    @Request() req,
  ) {
    return this.proposalsService.returnToCreator(
      id,
      req.user.userId,
      body.reason,
    );
  }

  @Get(':id/stage-history')
  getStageHistory(@Param('id') id: string) {
    return this.proposalsService.getStageHistory(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.proposalsService.remove(id);
  }
}
