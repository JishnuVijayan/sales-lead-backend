import { Controller, Get, Post, Body, Param, Delete, Query, HttpCode, HttpStatus, UseGuards, Request, Patch } from '@nestjs/common';
import { ProposalActivitiesService } from './proposal-activities.service';
import { CreateProposalActivityDto, CreateProposalActivityCommentDto } from './dto/proposal-activity.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ProposalActivityType } from '../../entities/proposal-activity.entity';

@Controller('proposal-activities')
@UseGuards(JwtAuthGuard)
export class ProposalActivitiesController {
  constructor(private readonly proposalActivitiesService: ProposalActivitiesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createDto: CreateProposalActivityDto, @Request() req: any) {
    return this.proposalActivitiesService.create(createDto, req.user.id);
  }

  @Post('comment')
  @HttpCode(HttpStatus.CREATED)
  createComment(@Body() dto: CreateProposalActivityCommentDto, @Request() req: any) {
    return this.proposalActivitiesService.createComment(dto, req.user.id);
  }

  @Get()
  findAll(
    @Query('proposalId') proposalId?: string,
    @Query('activityType') activityType?: ProposalActivityType,
  ) {
    return this.proposalActivitiesService.findAll(proposalId, activityType);
  }

  @Get('proposal/:proposalId')
  findByProposal(@Param('proposalId') proposalId: string) {
    return this.proposalActivitiesService.findAll(proposalId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.proposalActivitiesService.findOne(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.proposalActivitiesService.remove(id);
  }

  @Patch(':id/complete')
  complete(@Param('id') id: string, @Request() req: any) {
    return this.proposalActivitiesService.complete(id, req.user.id);
  }
}
