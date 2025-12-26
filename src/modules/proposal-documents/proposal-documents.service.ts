import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProposalDocument, UploadReason } from '../../entities/proposal-document.entity';
import { Document } from '../../entities/document.entity';
import { Proposal } from '../../entities/proposal.entity';
import { CreateProposalDocumentDto, UpdateProposalDocumentDto } from './dto/proposal-document.dto';
import { DocumentsService } from '../documents/documents.service';

@Injectable()
export class ProposalDocumentsService {
  constructor(
    @InjectRepository(ProposalDocument)
    private proposalDocumentsRepository: Repository<ProposalDocument>,
    @InjectRepository(Proposal)
    private proposalsRepository: Repository<Proposal>,
    @InjectRepository(Document)
    private documentsRepository: Repository<Document>,
    private documentsService: DocumentsService,
  ) {}

  async create(createDto: CreateProposalDocumentDto, userId: string): Promise<ProposalDocument> {
    const proposal = await this.proposalsRepository.findOne({
      where: { id: createDto.proposalId },
    });

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    // If this is marked as current, unmark all other current documents for this proposal
    if (createDto.isCurrentVersion) {
      await this.proposalDocumentsRepository.update(
        { proposalId: createDto.proposalId, isCurrentVersion: true },
        { isCurrentVersion: false }
      );
    }

    // If this is marked as final, unmark all other final documents for this proposal
    if (createDto.isFinalVersion) {
      await this.proposalDocumentsRepository.update(
        { proposalId: createDto.proposalId, isFinalVersion: true },
        { isFinalVersion: false }
      );
    }

    const proposalDocument = this.proposalDocumentsRepository.create({
      ...createDto,
      uploadedById: userId,
      version: createDto.version || proposal.version,
    });

    const saved = await this.proposalDocumentsRepository.save(proposalDocument);

    // Update proposal's current/final document references
    if (saved.isCurrentVersion) {
      await this.proposalsRepository.update(proposal.id, { currentDocumentId: saved.documentId });
    }
    if (saved.isFinalVersion) {
      await this.proposalsRepository.update(proposal.id, { finalDocumentId: saved.documentId });
    }

    return this.findOne(saved.id);
  }

  async uploadProposalDocument(
    proposalId: string,
    file: Express.Multer.File,
    uploadReason: UploadReason,
    revisionNotes: string,
    description: string,
    userId: string,
  ): Promise<ProposalDocument> {
    const proposal = await this.proposalsRepository.findOne({
      where: { id: proposalId },
    });

    if (!proposal) {
      throw new NotFoundException('Proposal not found');
    }

    // First, upload the document using DocumentsService
    const document = await this.documentsService.create(
      {
        leadId: proposal.leadId,
        description: description || `Proposal document - ${uploadReason}`,
        documentType: 'Proposal' as any,
      },
      file,
      userId,
    );

    // Unmark all previous documents as current
    await this.proposalDocumentsRepository.update(
      { proposalId: proposalId, isCurrentVersion: true },
      { isCurrentVersion: false }
    );

    // Create ProposalDocument entry
    const proposalDocument = this.proposalDocumentsRepository.create({
      proposalId,
      documentId: document.id,
      version: proposal.version,
      uploadReason: uploadReason || UploadReason.INITIAL,
      revisionNotes,
      isCurrentVersion: true,
      isFinalVersion: uploadReason === UploadReason.FINAL,
      uploadedById: userId,
    });

    const saved = await this.proposalDocumentsRepository.save(proposalDocument);

    // Update proposal reference
    await this.proposalsRepository.update(proposalId, { currentDocumentId: document.id });

    if (uploadReason === UploadReason.FINAL) {
      await this.proposalsRepository.update(proposalId, { finalDocumentId: document.id });
    }

    return this.findOne(saved.id);
  }

  async findAll(proposalId?: string): Promise<ProposalDocument[]> {
    const where = proposalId ? { proposalId } : {};
    return await this.proposalDocumentsRepository.find({
      where,
      relations: ['proposal', 'document', 'uploadedBy'],
      order: { uploadedDate: 'DESC' },
    });
  }

  async findOne(id: string): Promise<ProposalDocument> {
    const proposalDocument = await this.proposalDocumentsRepository.findOne({
      where: { id },
      relations: ['proposal', 'document', 'uploadedBy'],
    });

    if (!proposalDocument) {
      throw new NotFoundException('Proposal document not found');
    }

    return proposalDocument;
  }

  async update(id: string, updateDto: UpdateProposalDocumentDto): Promise<ProposalDocument> {
    const proposalDocument = await this.findOne(id);

    // If marking as current, unmark all others
    if (updateDto.isCurrentVersion) {
      await this.proposalDocumentsRepository.update(
        { proposalId: proposalDocument.proposalId, isCurrentVersion: true },
        { isCurrentVersion: false }
      );

      await this.proposalsRepository.update(proposalDocument.proposalId, {
        currentDocumentId: proposalDocument.documentId,
      });
    }

    // If marking as final, unmark all others
    if (updateDto.isFinalVersion) {
      await this.proposalDocumentsRepository.update(
        { proposalId: proposalDocument.proposalId, isFinalVersion: true },
        { isFinalVersion: false }
      );

      await this.proposalsRepository.update(proposalDocument.proposalId, {
        finalDocumentId: proposalDocument.documentId,
      });
    }

    await this.proposalDocumentsRepository.update(id, updateDto);
    return this.findOne(id);
  }

  async markAsFinal(id: string): Promise<ProposalDocument> {
    return this.update(id, { isFinalVersion: true, isCurrentVersion: true });
  }

  async getHistory(proposalId: string): Promise<ProposalDocument[]> {
    return this.findAll(proposalId);
  }

  async remove(id: string): Promise<void> {
    const proposalDocument = await this.findOne(id);
    
    // Also delete the actual document
    await this.documentsService.remove(proposalDocument.documentId);
    
    await this.proposalDocumentsRepository.remove(proposalDocument);
  }
}
