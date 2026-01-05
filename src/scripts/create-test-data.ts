import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { LeadsService } from '../modules/leads/leads.service';
import { ProposalsService } from '../modules/proposals/proposals.service';
import { UsersService } from '../modules/users/users.service';
import { LeadStatus, LeadSource } from '../entities/lead.entity';
import { ProposalStatus } from '../entities/proposal.entity';

async function createTestData() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const leadsService = app.get(LeadsService);
  const proposalsService = app.get(ProposalsService);
  const usersService = app.get(UsersService);

  try {
    // Get the first user (sales executive)
    const users = await usersService.findAll();
    if (!users || users.length === 0) {
      throw new Error('No users found. Please run the seed script first.');
    }
    const user = users[0];
    console.log('Using user:', user.id, user.email);

    // Create a test lead
    const lead = await leadsService.create(
      {
        name: 'Test Lead for PDF',
        organization: 'Test Company',
        email: 'test@company.com',
        phone: '123-456-7890',
        source: LeadSource.WEBSITE,
        productInterest: 'Software Solution',
        requirementSummary: 'Need a comprehensive software solution',
      },
      user.id,
    );

    console.log('Created test lead:', lead.id);

    // Create a proposal for the lead
    const proposal = await proposalsService.create(
      {
        title: 'Test Proposal',
        description: 'This is a test proposal for PDF generation',
        leadId: lead.id,
        validUntil: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(), // 30 days from now
        items: [
          {
            itemName: 'Software License',
            description: 'Annual software license',
            quantity: 1,
            unitPrice: 1000,
          },
          {
            itemName: 'Implementation Services',
            description: 'Professional implementation services',
            quantity: 10,
            unitPrice: 200,
          },
        ],
      },
      user.id,
    ); // created by user

    console.log('Created test proposal:', proposal.id);
    console.log('Test data created successfully!');
    console.log('Proposal ID for testing:', proposal.id);
  } catch (error) {
    console.error('Error creating test data:', error);
  }

  await app.close();
}

createTestData().catch(console.error);
