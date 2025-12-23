import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query, Put } from '@nestjs/common';
import { AgreementsService } from './agreements.service';
import { CreateAgreementDto, UpdateAgreementDto, ChangeStageDto, SignAgreementDto, TerminateAgreementDto } from './dto/agreement.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';

@Controller('agreements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AgreementsController {
  constructor(private readonly agreementsService: AgreementsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.ACCOUNT_MANAGER, UserRole.SALES_MANAGER, UserRole.LEGAL)
  create(@Body() createAgreementDto: CreateAgreementDto, @Request() req) {
    return this.agreementsService.create(createAgreementDto, req.user.userId);
  }

  @Get()
  findAll(@Query() filters: any) {
    return this.agreementsService.findAll(filters);
  }

  @Get('lead/:leadId')
  findByLead(@Param('leadId') leadId: string) {
    return this.agreementsService.findByLead(leadId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.agreementsService.findOne(id);
  }

  @Get(':id/history')
  getStageHistory(@Param('id') id: string) {
    return this.agreementsService.getStageHistory(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNT_MANAGER, UserRole.SALES_MANAGER, UserRole.LEGAL)
  update(@Param('id') id: string, @Body() updateAgreementDto: UpdateAgreementDto, @Request() req) {
    return this.agreementsService.update(id, updateAgreementDto, req.user.userId);
  }

  @Put(':id/change-stage')
  @Roles(
    UserRole.ADMIN,
    UserRole.ACCOUNT_MANAGER,
    UserRole.SALES_MANAGER,
    UserRole.LEGAL,
    UserRole.DELIVERY_MANAGER,
    UserRole.PROCUREMENT,
    UserRole.FINANCE,
    UserRole.CEO,
    UserRole.ULCCS_APPROVER
  )
  changeStage(@Param('id') id: string, @Body() changeStageDto: ChangeStageDto, @Request() req) {
    return this.agreementsService.changeStage(id, changeStageDto, req.user.userId);
  }

  @Put(':id/sign-client')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNT_MANAGER)
  signByClient(@Param('id') id: string, @Body() signDto: SignAgreementDto, @Request() req) {
    return this.agreementsService.signByClient(id, signDto, req.user.userId);
  }

  @Put(':id/sign-company')
  @Roles(UserRole.ADMIN, UserRole.CEO, UserRole.ACCOUNT_MANAGER, UserRole.SALES_MANAGER)
  signByCompany(@Param('id') id: string, @Body() signDto: SignAgreementDto, @Request() req) {
    return this.agreementsService.signByCompany(id, signDto, req.user.userId);
  }

  @Put(':id/terminate')
  @Roles(UserRole.ADMIN, UserRole.CEO, UserRole.SALES_MANAGER)
  terminate(@Param('id') id: string, @Body() terminateDto: TerminateAgreementDto, @Request() req) {
    return this.agreementsService.terminate(id, terminateDto, req.user.userId);
  }

  @Put(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNT_MANAGER, UserRole.SALES_MANAGER)
  cancel(@Param('id') id: string, @Body() body: { reason: string }, @Request() req) {
    return this.agreementsService.cancel(id, body.reason, req.user.userId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.agreementsService.remove(id);
  }

  // Module 10: Legal Drafting Endpoints
  @Put(':id/upload-draft')
  @Roles(UserRole.ADMIN, UserRole.LEGAL)
  uploadDraft(
    @Param('id') id: string,
    @Body() body: { documentPath: string; comments?: string },
    @Request() req
  ) {
    return this.agreementsService.uploadDraft(id, body.documentPath, req.user.userId, body.comments);
  }

  @Put(':id/submit-legal-review')
  @Roles(UserRole.ADMIN, UserRole.LEGAL)
  submitForLegalReview(
    @Param('id') id: string,
    @Body() body: { legalNotes?: string },
    @Request() req
  ) {
    return this.agreementsService.submitForLegalReview(id, req.user.userId, body.legalNotes);
  }

  @Put(':id/legal-notes')
  @Roles(UserRole.ADMIN, UserRole.LEGAL)
  updateLegalNotes(
    @Param('id') id: string,
    @Body() body: { legalNotes: string },
    @Request() req
  ) {
    return this.agreementsService.updateLegalNotes(id, req.user.userId, body.legalNotes);
  }

  @Get(':id/version-history')
  getDocumentVersionHistory(@Param('id') id: string) {
    return this.agreementsService.getDocumentVersionHistory(id);
  }

  // Module 11: Review Endpoints
  @Put(':id/review-delivery')
  @Roles(UserRole.ADMIN, UserRole.DELIVERY_MANAGER)
  reviewByDelivery(
    @Param('id') id: string,
    @Body() body: { approved: boolean; comments?: string },
    @Request() req
  ) {
    return this.agreementsService.reviewByDelivery(id, req.user.userId, body.approved, body.comments);
  }

  @Put(':id/review-procurement')
  @Roles(UserRole.ADMIN, UserRole.PROCUREMENT)
  reviewByProcurement(
    @Param('id') id: string,
    @Body() body: { approved: boolean; comments?: string },
    @Request() req
  ) {
    return this.agreementsService.reviewByProcurement(id, req.user.userId, body.approved, body.comments);
  }

  @Put(':id/review-finance')
  @Roles(UserRole.ADMIN, UserRole.FINANCE)
  reviewByFinance(
    @Param('id') id: string,
    @Body() body: { approved: boolean; comments?: string },
    @Request() req
  ) {
    return this.agreementsService.reviewByFinance(id, req.user.userId, body.approved, body.comments);
  }

  @Get(':id/review-status')
  getReviewStatus(@Param('id') id: string) {
    return this.agreementsService.getReviewStatus(id);
  }

  // Module 12: CEO & ULCCS Approval Endpoints
  @Put(':id/approve-ceo')
  @Roles(UserRole.ADMIN, UserRole.CEO)
  approveByCEO(
    @Param('id') id: string,
    @Body() body: { approved: boolean; comments?: string },
    @Request() req
  ) {
    return this.agreementsService.approveByCEO(id, req.user.userId, body.approved, body.comments);
  }

  @Put(':id/approve-ulccs')
  @Roles(UserRole.ADMIN, UserRole.ULCCS_APPROVER)
  approveByULCCS(
    @Param('id') id: string,
    @Body() body: { approved: boolean; comments?: string },
    @Request() req
  ) {
    return this.agreementsService.approveByULCCS(id, req.user.userId, body.approved, body.comments);
  }

  @Get(':id/final-approval-status')
  getFinalApprovalStatus(@Param('id') id: string) {
    return this.agreementsService.getFinalApprovalStatus(id);
  }

  @Get(':id/metrics')
  getAgreementMetrics(@Param('id') id: string) {
    return this.agreementsService.getAgreementMetrics(id);
  }

  // Critical Gap: Client Review & PM Allocation
  @Put(':id/review-client')
  @Roles(UserRole.ADMIN, UserRole.ACCOUNT_MANAGER)
  reviewByClient(
    @Param('id') id: string,
    @Body() body: { clientReviewedBy: string; approved: boolean; comments?: string },
    @Request() req
  ) {
    return this.agreementsService.reviewByClient(id, body.clientReviewedBy, body.approved, body.comments);
  }

  @Put(':id/allocate-pm')
  @Roles(UserRole.ADMIN, UserRole.DELIVERY_MANAGER, UserRole.ACCOUNT_MANAGER)
  allocatePM(
    @Param('id') id: string,
    @Body() body: { pmAllocatedId: string; projectId?: string }
  ) {
    return this.agreementsService.allocatePM(id, body.pmAllocatedId, body.projectId);
  }

  @Put(':id/update-project-id')
  @Roles(UserRole.ADMIN, UserRole.DELIVERY_MANAGER)
  updateProjectId(
    @Param('id') id: string,
    @Body() body: { projectId: string }
  ) {
    return this.agreementsService.updateProjectId(id, body.projectId);
  }
}

