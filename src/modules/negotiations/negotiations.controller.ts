import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  Put,
  UseGuards,
  Request,
} from '@nestjs/common';
import { NegotiationsService } from './negotiations.service';
import {
  CreateNegotiationDto,
  UpdateNegotiationDto,
} from './dto/negotiation.dto';
import { NegotiationOutcome } from '../../entities';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';

@Controller('negotiations')
@UseGuards(JwtAuthGuard, RolesGuard)
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
  update(
    @Param('id') id: string,
    @Body() updateNegotiationDto: UpdateNegotiationDto,
  ) {
    return this.negotiationsService.update(id, updateNegotiationDto);
  }

  @Patch(':id/complete')
  @HttpCode(HttpStatus.OK)
  completeNegotiation(
    @Param('id') id: string,
    @Body() body: { outcome: NegotiationOutcome; finalAmount?: number },
  ) {
    return this.negotiationsService.completeNegotiation(
      id,
      body.outcome,
      body.finalAmount,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.negotiationsService.remove(id);
  }

  // Phase 2 Module 2.5: Revision endpoints
  @Put(':id/request-revision')
  @Roles(UserRole.ACCOUNT_MANAGER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  requestRevision(
    @Param('id') id: string,
    @Request() req,
    @Body()
    body: { revisionReason: string; changes: Partial<UpdateNegotiationDto> },
  ) {
    return this.negotiationsService.requestRevision(
      id,
      req.user.userId,
      body.revisionReason,
      body.changes,
    );
  }

  @Put(':id/approve-revision')
  @Roles(UserRole.SALES_MANAGER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  approveRevision(
    @Param('id') id: string,
    @Request() req,
    @Body() body: { approved: boolean; notes?: string },
  ) {
    return this.negotiationsService.approveRevision(
      id,
      req.user.userId,
      body.approved,
      body.notes,
    );
  }

  @Get(':id/revision-history')
  getRevisionHistory(@Param('id') id: string) {
    return this.negotiationsService.getRevisionHistory(id);
  }
}
