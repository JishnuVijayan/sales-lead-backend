import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import { Agreement, AgreementStage } from '../entities/agreement.entity';
import { AgreementStageHistory } from '../entities/agreement-stage-history.entity';

async function checkAgreementDates() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  const agreementRepo = dataSource.getRepository(Agreement);
  const historyRepo = dataSource.getRepository(AgreementStageHistory);

  try {
    console.log('🔍 Checking signed agreements...\n');

    const signedAgreements = await agreementRepo.find({
      where: { stage: AgreementStage.SIGNED },
    });

    console.log(`Found ${signedAgreements.length} signed agreements\n`);

    for (const agreement of signedAgreements) {
      console.log(`📄 Agreement: ${agreement.agreementNumber || agreement.id}`);
      console.log(`   Stage: ${agreement.stage}`);
      console.log(`   Created: ${agreement.createdDate}`);
      console.log(
        `   Client Signed Date: ${agreement.clientSignedDate || 'NOT SET'}`,
      );
      console.log(
        `   Company Signed Date: ${agreement.companySignedDate || 'NOT SET'}`,
      );
      console.log(
        `   Company Signed By: ${agreement.companySignedById || 'NOT SET'}`,
      );

      // Get stage history
      const histories = await historyRepo.find({
        where: { agreementId: agreement.id },
        order: { changedDate: 'ASC' },
      });

      console.log(`\n   📊 Stage History (${histories.length} entries):`);
      histories.forEach((h, idx) => {
        console.log(
          `      ${idx + 1}. ${h.fromStage} → ${h.toStage} (${h.changedDate})`,
        );
      });

      // Calculate cycle time
      const signedDate =
        agreement.clientSignedDate || agreement.companySignedDate;
      if (signedDate) {
        const cycleTime = Math.floor(
          (new Date(signedDate).getTime() -
            new Date(agreement.createdDate).getTime()) /
            (1000 * 60 * 60 * 24),
        );
        console.log(`\n   ⏱️  Total Cycle Time: ${cycleTime} days`);
      } else {
        console.log(`\n   ⚠️  No signing date found!`);
      }

      console.log('\n' + '━'.repeat(80) + '\n');
    }

    // Check if we need to set signing dates
    if (
      signedAgreements.some((a) => !a.clientSignedDate && !a.companySignedDate)
    ) {
      console.log('⚠️  Some signed agreements are missing signing dates!');
      console.log(
        '💡 Signing dates should be set when the agreement is signed.\n',
      );
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }

  await app.close();
}

checkAgreementDates().catch(console.error);
