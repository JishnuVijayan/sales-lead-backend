import { Controller, Get, Post, Body, Param, Delete, Query, HttpCode, HttpStatus, UseGuards, Request } from '@nestjs/common';
import { ProposalApprovalConfigsService } from './proposal-approval-configs.service';
import { CreateProposalApprovalConfigDto, DefineProposalApprovalFlowDto } from './dto/proposal-approval-config.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('proposal-approval-configs')
@UseGuards(JwtAuthGuard)
export class ProposalApprovalConfigsController {
  constructor(private readonly configsService: ProposalApprovalConfigsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createDto: CreateProposalApprovalConfigDto, @Request() req: any) {
    return this.configsService.create(createDto, req.user.id);
  }

  @Post('define-flow')
  @HttpCode(HttpStatus.CREATED)
  defineApprovalFlow(@Body() dto: DefineProposalApprovalFlowDto, @Request() req: any) {
    return this.configsService.defineApprovalFlow(dto, req.user.id);
  }

  @Get('available-approvers')
  getAvailableApprovers() {
    return this.configsService.getAvailableApprovers();
  }

  @Get()
  findAll(@Query('proposalId') proposalId?: string) {
    return this.configsService.findAll(proposalId);
  }

  @Get('proposal/:proposalId')
  findByProposal(@Param('proposalId') proposalId: string) {
    return this.configsService.findByProposal(proposalId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.configsService.findOne(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.configsService.remove(id);
  }

  @Delete('proposal/:proposalId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeByProposal(@Param('proposalId') proposalId: string) {
    return this.configsService.removeByProposal(proposalId);
  }
}
