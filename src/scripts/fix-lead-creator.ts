import { DataSource } from 'typeorm';
import { 
  Lead, 
  User, 
  LeadActivity, 
  Proposal, 
  ProposalItem, 
  WorkOrder, 
  Document, 
  Negotiation 
} from '../entities';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'ULTS@13032003',
  database: 'lead_sales',
  entities: [Lead, User, LeadActivity, Proposal, ProposalItem, WorkOrder, Document, Negotiation],
  synchronize: false,
});

async function fixLeadCreator() {
  await AppDataSource.initialize();
  console.log('Database connected');

  const leadRepository = AppDataSource.getRepository(Lead);

  // John Smith's user ID from console log
  const johnSmithId = 'd9c561c3-d083-45f8-aae6-c57689c1963e';
  // Lead ID from console log
  const leadId = '2aadb49b-1e60-4e38-8b60-2c08b9b7ef7e';

  const lead = await leadRepository.findOne({ where: { id: leadId } });
  
  if (!lead) {
    console.log('❌ Lead not found');
    await AppDataSource.destroy();
    return;
  }

  console.log('Lead before fix:', {
    id: lead.id,
    name: lead.name,
    createdById: lead.createdById,
    assignedToId: lead.assignedToId
  });

  // Set John Smith as the creator
  lead.createdById = johnSmithId;
  await leadRepository.save(lead);

  // Refetch to verify
  const updatedLead = await leadRepository.findOne({ where: { id: leadId } });

  console.log('✅ Lead fixed! John Smith is now the creator.');
  console.log('Lead after fix:', {
    id: updatedLead!.id,
    name: updatedLead!.name,
    createdById: updatedLead!.createdById,
    assignedToId: updatedLead!.assignedToId
  });

  await AppDataSource.destroy();
}

fixLeadCreator().catch(console.error);
