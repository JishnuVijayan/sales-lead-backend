import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { ApprovalsService } from './approvals.service';
import {
  CreateApprovalDto,
  RespondToApprovalDto,
  BulkCreateApprovalsDto,
} from './dto/approval.dto';
import { ApprovalContext } from '../../entities/approval.entity';

@Controller('approvals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  async create(@Body() createDto: CreateApprovalDto) {
    return await this.approvalsService.create(createDto);
  }

  @Post('workflow')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNT_MANAGER, UserRole.PRESALES)
  async createWorkflow(@Body() bulkDto: BulkCreateApprovalsDto) {
    return await this.approvalsService.createApprovalWorkflow(bulkDto);
  }

  @Get('entity/:context/:entityId')
  async findByEntity(
    @Param('context') context: ApprovalContext,
    @Param('entityId') entityId: string,
  ) {
    return await this.approvalsService.findByEntity(context, entityId);
  }

  @Get('my-pending')
  async getMyPending(@Request() req) {
    return await this.approvalsService.findPendingForUser(req.user.userId);
  }

  @Get('pending-by-role')
  async getPendingByRole(@Query('role') role: string) {
    return await this.approvalsService.findPendingByRole(role);
  }

  @Put(':id/respond')
  async respond(
    @Param('id') id: string,
    @Request() req,
    @Body() respondDto: RespondToApprovalDto,
  ) {
    return await this.approvalsService.respondToApproval(
      id,
      req.user.userId,
      respondDto,
    );
  }

  @Get('summary/:context/:entityId')
  async getSummary(
    @Param('context') context: ApprovalContext,
    @Param('entityId') entityId: string,
  ) {
    return await this.approvalsService.getApprovalSummary(context, entityId);
  }

  @Put(':id/skip')
  @Roles(UserRole.ADMIN, UserRole.SALES_MANAGER)
  async skip(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Request() req,
  ) {
    return await this.approvalsService.skipApproval(
      id,
      req.user.userId,
      reason,
    );
  }

  @Delete('entity/:context/:entityId')
  @Roles(UserRole.ADMIN)
  async deleteByEntity(
    @Param('context') context: ApprovalContext,
    @Param('entityId') entityId: string,
  ) {
    await this.approvalsService.deleteByEntity(context, entityId);
    return { message: 'Approvals deleted successfully' };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.approvalsService.findOne(id);
  }
}
