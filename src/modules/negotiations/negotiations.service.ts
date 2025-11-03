import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Negotiation, NegotiationStatus, NegotiationOutcome } from '../../entities';
import { CreateNegotiationDto, UpdateNegotiationDto } from './dto/negotiation.dto';

@Injectable()
export class NegotiationsService {
  constructor(
    @InjectRepository(Negotiation)
    private negotiationsRepository: Repository<Negotiation>,
  ) {}

  async create(createNegotiationDto: CreateNegotiationDto): Promise<Negotiation> {
    const negotiation = this.negotiationsRepository.create({
      ...createNegotiationDto,
      status: NegotiationStatus.ACTIVE,
      callCount: createNegotiationDto.callCount || 0,
      meetingCount: createNegotiationDto.meetingCount || 0,
      emailCount: createNegotiationDto.emailCount || 0,
    });

    return await this.negotiationsRepository.save(negotiation);
  }

  async findAll(leadId?: string): Promise<Negotiation[]> {
    const query = this.negotiationsRepository.createQueryBuilder('negotiation')
      .leftJoinAndSelect('negotiation.lead', 'lead')
      .leftJoinAndSelect('negotiation.negotiator', 'negotiator')
      .orderBy('negotiation.createdDate', 'DESC');

    if (leadId) {
      query.andWhere('negotiation.leadId = :leadId', { leadId });
    }

    return await query.getMany();
  }

  async findOne(id: string): Promise<Negotiation> {
    const negotiation = await this.negotiationsRepository.findOne({
      where: { id },
      relations: ['lead', 'negotiator'],
    });

    if (!negotiation) {
      throw new NotFoundException(`Negotiation with ID ${id} not found`);
    }

    return negotiation;
  }

  async update(id: string, updateNegotiationDto: UpdateNegotiationDto): Promise<Negotiation> {
    const negotiation = await this.findOne(id);

    // If status is being updated to completed, set actual closure date
    if (updateNegotiationDto.status === NegotiationStatus.COMPLETED && !negotiation.actualClosureDate) {
      updateNegotiationDto.actualClosureDate = new Date().toISOString().split('T')[0];
    }

    Object.assign(negotiation, updateNegotiationDto);
    return await this.negotiationsRepository.save(negotiation);
  }

  async remove(id: string): Promise<void> {
    const negotiation = await this.findOne(id);
    await this.negotiationsRepository.remove(negotiation);
  }

  async completeNegotiation(id: string, outcome: NegotiationOutcome, finalAmount?: number): Promise<Negotiation> {
    const negotiation = await this.findOne(id);

    return await this.update(id, {
      status: NegotiationStatus.COMPLETED,
      outcome,
      finalAmount,
      actualClosureDate: new Date().toISOString().split('T')[0],
    });
  }

  async getNegotiationStats(leadId: string): Promise<{
    totalNegotiations: number;
    activeNegotiations: number;
    completedNegotiations: number;
    totalCalls: number;
    totalMeetings: number;
    averageExpectedAmount: number;
  }> {
    const negotiations = await this.findAll(leadId);

    const stats = {
      totalNegotiations: negotiations.length,
      activeNegotiations: negotiations.filter(n => n.status === NegotiationStatus.ACTIVE).length,
      completedNegotiations: negotiations.filter(n => n.status === NegotiationStatus.COMPLETED).length,
      totalCalls: negotiations.reduce((sum, n) => sum + n.callCount, 0),
      totalMeetings: negotiations.reduce((sum, n) => sum + n.meetingCount, 0),
      averageExpectedAmount: negotiations.length > 0
        ? negotiations.reduce((sum, n) => sum + n.expectedAmount, 0) / negotiations.length
        : 0,
    };

    return stats;
  }
}