import { Controller, Get, Post, Body, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { AgreementApprovalConfigsService } from './agreement-approval-configs.service';
import { CreateAgreementApprovalConfigDto, DefineAgreementApprovalFlowDto } from './dto/agreement-approval-config.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';

@Controller('agreement-approval-configs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AgreementApprovalConfigsController {
  constructor(
    private readonly agreementApprovalConfigsService: AgreementApprovalConfigsService,
  ) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.LEGAL)
  create(@Body() createDto: CreateAgreementApprovalConfigDto, @Request() req) {
    return this.agreementApprovalConfigsService.create(createDto, req.user.userId);
  }

  @Post('define-flow')
  @Roles(UserRole.ADMIN, UserRole.LEGAL)
  defineApprovalFlow(@Body() dto: DefineAgreementApprovalFlowDto, @Request() req) {
    return this.agreementApprovalConfigsService.defineApprovalFlow(dto, req.user.userId);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.LEGAL, UserRole.SALES_MANAGER, UserRole.ACCOUNT_MANAGER, UserRole.DELIVERY_MANAGER, UserRole.FINANCE, UserRole.CEO, UserRole.ULCCS_APPROVER, UserRole.PROCUREMENT)
  findAll(@Param('agreementId') agreementId?: string) {
    return this.agreementApprovalConfigsService.findAll(agreementId);
  }

  @Get('agreement/:agreementId')
  @Roles(UserRole.ADMIN, UserRole.LEGAL, UserRole.SALES_MANAGER, UserRole.ACCOUNT_MANAGER, UserRole.DELIVERY_MANAGER, UserRole.FINANCE, UserRole.CEO, UserRole.ULCCS_APPROVER, UserRole.PROCUREMENT)
  findByAgreement(@Param('agreementId') agreementId: string) {
    return this.agreementApprovalConfigsService.findByAgreement(agreementId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.LEGAL, UserRole.SALES_MANAGER, UserRole.ACCOUNT_MANAGER, UserRole.DELIVERY_MANAGER, UserRole.FINANCE, UserRole.CEO, UserRole.ULCCS_APPROVER, UserRole.PROCUREMENT)
  findOne(@Param('id') id: string) {
    return this.agreementApprovalConfigsService.findOne(id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.LEGAL)
  remove(@Param('id') id: string) {
    return this.agreementApprovalConfigsService.remove(id);
  }
}