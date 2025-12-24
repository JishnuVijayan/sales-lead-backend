import { DataSource } from 'typeorm';
import { Agreement } from '../entities/agreement.entity';
import { AgreementStageHistory } from '../entities/agreement-stage-history.entity';
import { User } from '../entities/user.entity';
import { Lead } from '../entities/lead.entity';
import { LeadActivity } from '../entities/lead-activity.entity';
import { Proposal } from '../entities/proposal.entity';
import { ProposalItem } from '../entities/proposal-item.entity';
import { Negotiation } from '../entities/negotiation.entity';
import { WorkOrder } from '../entities/work-order.entity';
import { Document } from '../entities/document.entity';
import { Approval } from '../entities/approval.entity';
import { SLAConfig } from '../entities/sla-config.entity';
import { Notification } from '../entities/notification.entity';

async function fixAgreementSigningDates() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: 'ULTS@13032003',
    database: 'lead_sales',
    entities: [
      User,
      Lead,
      LeadActivity,
      Proposal,
      ProposalItem,
      Negotiation,
      WorkOrder,
      Document,
      Approval,
      Agreement,
      AgreementStageHistory,
      SLAConfig,
      Notification,
    ],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log('📡 Connected to database');

    const agreementRepo = dataSource.getRepository(Agreement);
    const historyRepo = dataSource.getRepository(AgreementStageHistory);

    // Find all signed agreements without signing dates
    const signedAgreements = await agreementRepo.find({
      where: { stage: 'Signed' as any },
      relations: ['companySignedBy'],
    });

    console.log(`\n🔍 Found ${signedAgreements.length} signed agreements\n`);

    for (const agreement of signedAgreements) {
      console.log(`📄 Processing ${agreement.agreementNumber}...`);

      // Check if signing dates are already set
      if (agreement.clientSignedDate || agreement.companySignedDate) {
        console.log('   ✅ Signing dates already set, skipping');
        continue;
      }

      // Find the stage history entry where agreement transitioned to Signed
      const signedHistory = await historyRepo.findOne({
        where: {
          agreementId: agreement.id,
          toStage: 'Signed' as any,
        },
        order: { changedDate: 'DESC' },
        relations: ['changedBy'],
      });

      if (signedHistory) {
        // Set company signed date to the date when it transitioned to Signed
        agreement.companySignedDate = signedHistory.changedDate;
        
        // Set company signed by to the person who made the transition
        if (signedHistory.changedBy) {
          agreement.companySignedBy = signedHistory.changedBy;
        }

        await agreementRepo.save(agreement);

        console.log(`   ✅ Updated signing date to: ${signedHistory.changedDate}`);
        console.log(`   ✅ Signed by: ${signedHistory.changedBy?.name || 'Unknown'}`);
      } else {
        console.log('   ⚠️  No stage history found for Signed transition');
      }
    }

    console.log('\n✅ Done! All signed agreements updated.\n');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await dataSource.destroy();
  }
}

fixAgreementSigningDates();
