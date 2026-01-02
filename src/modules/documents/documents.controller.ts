import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto, UpdateDocumentDto } from './dto/document.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DocumentType } from '../../entities';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  // Map string document type to DocumentType enum
  private mapStringToDocumentType(
    documentType: string | undefined,
  ): DocumentType | undefined {
    if (!documentType) return undefined;

    const normalizedType = documentType.toUpperCase().trim();

    switch (normalizedType) {
      case 'RFP':
        return DocumentType.RFP;
      case 'QUOTATION':
        return DocumentType.QUOTATION;
      case 'PROPOSAL':
        return DocumentType.PROPOSAL;
      case 'CONTRACT':
        return DocumentType.CONTRACT;
      case 'AGREEMENT':
        return DocumentType.AGREEMENT;
      case 'WORK_ORDER':
      case 'WORKORDER':
        return DocumentType.WORK_ORDER;
      case 'EMAIL_ATTACHMENT':
      case 'EMAILATTACHMENT':
        return DocumentType.EMAIL_ATTACHMENT;
      case 'REQUIREMENT_DOC':
      case 'REQUIREMENTDOC':
      case 'REQUIREMENT_DOCUMENT':
      case 'REQUIREMENTDOCUMENT':
        return DocumentType.REQUIREMENT_DOC;
      case 'PRESENTATION':
        return DocumentType.PRESENTATION;
      case 'IMAGE':
        return DocumentType.IMAGE;
      case 'OTHER':
        return DocumentType.OTHER;
      default:
        // Try to match by enum value directly
        const enumValues = Object.values(DocumentType);
        const found = enumValues.find(
          (value) => value.toUpperCase() === normalizedType,
        );
        return found || undefined;
    }
  }

  @Post('upload')
  @UsePipes(
    new ValidationPipe({ whitelist: false, forbidNonWhitelisted: false }),
  )
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = file.originalname ? extname(file.originalname) : '';
          callback(null, `file-${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  @HttpCode(HttpStatus.CREATED)
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body()
    body: {
      leadId: string;
      workOrderId?: string;
      agreementId?: string;
      description?: string;
      documentType?: string;
    },
    @Request() req: any,
  ) {
    if (!file) {
      throw new Error('No file uploaded');
    }

    const userId = req.user.id;
    const createDocumentDto: CreateDocumentDto = {
      leadId: body.leadId,
      workOrderId: body.workOrderId || undefined,
      agreementId: body.agreementId || undefined,
      description: body.description || undefined,
      documentType: this.mapStringToDocumentType(body.documentType),
    };
    return this.documentsService.create(createDocumentDto, file, userId);
  }

  @Get()
  findAll(@Query('leadId') leadId?: string) {
    return this.documentsService.findAll(leadId);
  }

  @Get('work-order/:workOrderId')
  findByWorkOrder(@Param('workOrderId') workOrderId: string) {
    return this.documentsService.findByWorkOrder(workOrderId);
  }

  @Get('agreement/:agreementId')
  findByAgreement(@Param('agreementId') agreementId: string) {
    return this.documentsService.findByAgreement(agreementId);
  }

  @Get('lead/:leadId')
  findByLead(@Param('leadId') leadId: string) {
    return this.documentsService.findByLead(leadId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.documentsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
  ) {
    return this.documentsService.update(id, updateDocumentDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.documentsService.remove(id);
  }
}
