import { Controller, Get, Post, Body, Param, Delete, Query, UseGuards, Patch, Request } from '@nestjs/common';
import { AgreementActivitiesService } from './agreement-activities.service';
import { CreateAgreementActivityDto, CreateAgreementActivityCommentDto } from './dto/agreement-activity.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AgreementActivityType } from '../../entities/agreement-activity.entity';

@Controller('agreement-activities')
@UseGuards(JwtAuthGuard)
export class AgreementActivitiesController {
  constructor(private readonly agreementActivitiesService: AgreementActivitiesService) {}

  @Post()
  create(@Body() createDto: CreateAgreementActivityDto, @Request() req: any) {
    return this.agreementActivitiesService.create(createDto, req.user.id);
  }

  @Post('comment')
  createComment(@Body() dto: CreateAgreementActivityCommentDto, @Request() req: any) {
    return this.agreementActivitiesService.createComment(dto, req.user.id);
  }

  @Get()
  findAll(
    @Query('agreementId') agreementId?: string,
    @Query('activityType') activityType?: AgreementActivityType,
  ) {
    return this.agreementActivitiesService.findAll(agreementId, activityType);
  }

  @Get('agreement/:agreementId')
  findByAgreement(@Param('agreementId') agreementId: string) {
    return this.agreementActivitiesService.findByAgreement(agreementId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.agreementActivitiesService.findOne(id);
  }

  @Patch(':id/complete')
  complete(@Param('id') id: string, @Request() req: any) {
    return this.agreementActivitiesService.complete(id, req.user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.agreementActivitiesService.remove(id);
  }
}
