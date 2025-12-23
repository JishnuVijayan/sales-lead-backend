import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import { Lead, LeadStatus } from '../entities/lead.entity';

/**
 * Script to backfill stage transition dates for existing leads
 * This estimates dates based on created date and current status
 */
async function backfillLeadStageDates() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  const leadRepo = dataSource.getRepository(Lead);

  try {
    console.log('🔍 Finding leads without stage dates...\n');

    const leads = await leadRepo.find();

    console.log(`Found ${leads.length} total leads\n`);

    let updated = 0;

    for (const lead of leads) {
      let hasUpdates = false;
      const createdDate = new Date(lead.createdDate);

      console.log(`\n📝 Processing Lead: ${lead.name} (${lead.status})`);

      // Estimate stage dates based on created date and current status
      // This is a rough estimation - adjust intervals as needed
      
      switch (lead.status) {
        case LeadStatus.WON:
          if (!lead.wonDate) {
            // Assume the lead won recently or use closed date if available
            lead.wonDate = lead.closedDate || new Date();
            hasUpdates = true;
            console.log(`   ✓ Set wonDate: ${lead.wonDate.toISOString()}`);
          }
          if (!lead.negotiationDate) {
            // Estimate negotiation started 5 days before won
            lead.negotiationDate = new Date(lead.wonDate.getTime() - 5 * 24 * 60 * 60 * 1000);
            hasUpdates = true;
            console.log(`   ✓ Set negotiationDate: ${lead.negotiationDate.toISOString()}`);
          }
          if (!lead.proposalDate) {
            // Estimate proposal sent 7 days before negotiation
            lead.proposalDate = new Date(lead.negotiationDate.getTime() - 7 * 24 * 60 * 60 * 1000);
            hasUpdates = true;
            console.log(`   ✓ Set proposalDate: ${lead.proposalDate.toISOString()}`);
          }
          if (!lead.qualifiedDate) {
            // Estimate qualified 3 days after creation
            lead.qualifiedDate = new Date(createdDate.getTime() + 3 * 24 * 60 * 60 * 1000);
            hasUpdates = true;
            console.log(`   ✓ Set qualifiedDate: ${lead.qualifiedDate.toISOString()}`);
          }
          break;

        case LeadStatus.NEGOTIATION:
          if (!lead.negotiationDate) {
            lead.negotiationDate = new Date(); // Current date
            hasUpdates = true;
            console.log(`   ✓ Set negotiationDate: ${lead.negotiationDate.toISOString()}`);
          }
          if (!lead.proposalDate) {
            lead.proposalDate = new Date(lead.negotiationDate.getTime() - 7 * 24 * 60 * 60 * 1000);
            hasUpdates = true;
            console.log(`   ✓ Set proposalDate: ${lead.proposalDate.toISOString()}`);
          }
          if (!lead.qualifiedDate) {
            lead.qualifiedDate = new Date(lead.proposalDate.getTime() - 5 * 24 * 60 * 60 * 1000);
            hasUpdates = true;
            console.log(`   ✓ Set qualifiedDate: ${lead.qualifiedDate.toISOString()}`);
          }
          break;

        case LeadStatus.PROPOSAL:
          if (!lead.proposalDate) {
            lead.proposalDate = new Date();
            hasUpdates = true;
            console.log(`   ✓ Set proposalDate: ${lead.proposalDate.toISOString()}`);
          }
          if (!lead.qualifiedDate) {
            lead.qualifiedDate = new Date(lead.proposalDate.getTime() - 5 * 24 * 60 * 60 * 1000);
            hasUpdates = true;
            console.log(`   ✓ Set qualifiedDate: ${lead.qualifiedDate.toISOString()}`);
          }
          break;

        case LeadStatus.QUALIFIED:
          if (!lead.qualifiedDate) {
            lead.qualifiedDate = new Date();
            hasUpdates = true;
            console.log(`   ✓ Set qualifiedDate: ${lead.qualifiedDate.toISOString()}`);
          }
          break;

        case LeadStatus.LOST:
          if (!lead.lostDate) {
            lead.lostDate = lead.closedDate || new Date();
            hasUpdates = true;
            console.log(`   ✓ Set lostDate: ${lead.lostDate.toISOString()}`);
          }
          // Backfill previous stages if they exist in history
          if (!lead.negotiationDate && lead.lostDate) {
            lead.negotiationDate = new Date(lead.lostDate.getTime() - 5 * 24 * 60 * 60 * 1000);
            hasUpdates = true;
            console.log(`   ✓ Set negotiationDate: ${lead.negotiationDate.toISOString()}`);
          }
          if (!lead.proposalDate && lead.negotiationDate) {
            lead.proposalDate = new Date(lead.negotiationDate.getTime() - 7 * 24 * 60 * 60 * 1000);
            hasUpdates = true;
            console.log(`   ✓ Set proposalDate: ${lead.proposalDate.toISOString()}`);
          }
          if (!lead.qualifiedDate && lead.proposalDate) {
            lead.qualifiedDate = new Date(lead.proposalDate.getTime() - 5 * 24 * 60 * 60 * 1000);
            hasUpdates = true;
            console.log(`   ✓ Set qualifiedDate: ${lead.qualifiedDate.toISOString()}`);
          }
          break;

        case LeadStatus.DORMANT:
          if (!lead.dormantDate) {
            lead.dormantDate = new Date();
            hasUpdates = true;
            console.log(`   ✓ Set dormantDate: ${lead.dormantDate.toISOString()}`);
          }
          break;

        case LeadStatus.NEW:
          // Nothing to backfill for NEW leads
          console.log(`   → Lead is still NEW, no dates to backfill`);
          break;
      }

      if (hasUpdates) {
        await leadRepo.save(lead);
        updated++;
        console.log(`   ✅ Lead updated successfully`);
      } else {
        console.log(`   → No updates needed (dates already set)`);
      }
    }

    console.log('\n━'.repeat(80));
    console.log('\n📈 Summary:');
    console.log(`   ✅ Updated: ${updated} leads`);
    console.log(`   ℹ️  Already had dates: ${leads.length - updated} leads`);
    console.log(`   📊 Total: ${leads.length} leads`);
    console.log('\n✨ Backfill completed successfully!');
    console.log('\n💡 Note: Dates are estimated based on typical sales cycle patterns.');
    console.log('   Adjust the intervals in the script if needed for more accuracy.\n');

  } catch (error) {
    console.error('❌ Error backfilling stage dates:', error);
  }

  await app.close();
}

backfillLeadStageDates().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
