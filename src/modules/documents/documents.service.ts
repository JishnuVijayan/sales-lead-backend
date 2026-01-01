import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '../../entities';
import { CreateDocumentDto, UpdateDocumentDto } from './dto/document.dto';
import { LeadsService } from '../leads/leads.service';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private documentsRepository: Repository<Document>,
    private leadsService: LeadsService,
  ) {}

  async create(
    createDocumentDto: CreateDocumentDto,
    file: Express.Multer.File,
    userId: string,
  ): Promise<Document> {
    const document = this.documentsRepository.create({
      ...createDocumentDto,
      fileName: file.originalname || 'unnamed-file',
      filePath: file.path,
      fileSize: file.size || 0,
      mimeType: file.mimetype || 'application/octet-stream',
      uploadedById: userId,
    });

    const savedDocument = await this.documentsRepository.save(document);

    // Update lead's last action date
    await this.leadsService.update(createDocumentDto.leadId, {});

    return savedDocument;
  }

  async findAll(leadId?: string): Promise<Document[]> {
    const where = leadId ? { leadId } : {};
    return await this.documentsRepository.find({
      where,
      relations: ['lead', 'uploadedBy'],
      order: { uploadedDate: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Document> {
    const document = await this.documentsRepository.findOne({
      where: { id },
      relations: ['lead', 'uploadedBy'],
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  async update(
    id: string,
    updateDocumentDto: UpdateDocumentDto,
  ): Promise<Document> {
    const document = await this.findOne(id);

    const updatedDocument = this.documentsRepository.merge(
      document,
      updateDocumentDto,
    );
    return await this.documentsRepository.save(updatedDocument);
  }

  async remove(id: string): Promise<void> {
    const document = await this.findOne(id);
    await this.documentsRepository.remove(document);
  }

  async findByWorkOrder(workOrderId: string): Promise<Document[]> {
    return await this.documentsRepository.find({
      where: { workOrderId },
      relations: ['uploadedBy'],
      order: { uploadedDate: 'DESC' },
    });
  }

  async findByAgreement(agreementId: string): Promise<Document[]> {
    return await this.documentsRepository.find({
      where: { agreementId },
      relations: ['uploadedBy'],
      order: { uploadedDate: 'DESC' },
    });
  }

  async findByLead(leadId: string): Promise<Document[]> {
    return await this.documentsRepository.find({
      where: { leadId },
      relations: ['uploadedBy'],
      order: { uploadedDate: 'DESC' },
    });
  }
}
