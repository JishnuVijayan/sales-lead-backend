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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ProposalDocumentsService } from './proposal-documents.service';
import {
  CreateProposalDocumentDto,
  UpdateProposalDocumentDto,
  UploadProposalDocumentDto,
} from './dto/proposal-document.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { UploadReason } from '../../entities/proposal-document.entity';

@Controller('proposal-documents')
@UseGuards(JwtAuthGuard)
export class ProposalDocumentsController {
  constructor(
    private readonly proposalDocumentsService: ProposalDocumentsService,
  ) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = file.originalname ? extname(file.originalname) : '';
          callback(null, `proposal-${uniqueSuffix}${ext}`);
        },
      }),
      limits: {
        fileSize: 20 * 1024 * 1024, // 20MB for proposals
      },
    }),
  )
  @HttpCode(HttpStatus.CREATED)
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadProposalDocumentDto,
    @Request() req: any,
  ) {
    if (!file) {
      throw new Error('No file uploaded');
    }

    const userId = req.user.id;
    return this.proposalDocumentsService.uploadProposalDocument(
      body.proposalId,
      file,
      body.uploadReason || UploadReason.INITIAL,
      body.revisionNotes || '',
      body.description || '',
      userId,
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createDto: CreateProposalDocumentDto, @Request() req: any) {
    return this.proposalDocumentsService.create(createDto, req.user.id);
  }

  @Get()
  findAll(@Query('proposalId') proposalId?: string) {
    return this.proposalDocumentsService.findAll(proposalId);
  }

  @Get('proposal/:proposalId')
  getHistory(@Param('proposalId') proposalId: string) {
    return this.proposalDocumentsService.getHistory(proposalId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.proposalDocumentsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateProposalDocumentDto,
  ) {
    return this.proposalDocumentsService.update(id, updateDto);
  }

  @Patch(':id/mark-final')
  markAsFinal(@Param('id') id: string) {
    return this.proposalDocumentsService.markAsFinal(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.proposalDocumentsService.remove(id);
  }
}
