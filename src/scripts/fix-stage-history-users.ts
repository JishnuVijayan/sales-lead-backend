import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { AgreementStageHistory } from '../entities/agreement-stage-history.entity';
import { Agreement } from '../entities/agreement.entity';
import { User } from '../entities/user.entity';

/**
 * Script to fix stage history records that have no changedBy user
 * This will assign the agreement creator to stage history records that don't have a user
 */
async function fixStageHistoryUsers() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  const stageHistoryRepo = dataSource.getRepository(AgreementStageHistory);
  const agreementRepo = dataSource.getRepository(Agreement);
  const userRepo = dataSource.getRepository(User);

  try {
    console.log('🔍 Finding stage history records without users...\n');

    // Find all stage history records without changedBy
    const historyWithoutUser = await stageHistoryRepo
      .createQueryBuilder('history')
      .leftJoinAndSelect('history.agreement', 'agreement')
      .leftJoinAndSelect('agreement.createdBy', 'createdBy')
      .where('history.changedById IS NULL')
      .orderBy('history.changedDate', 'ASC')
      .getMany();

    console.log(`Found ${historyWithoutUser.length} stage history records without users\n`);

    if (historyWithoutUser.length === 0) {
      console.log('✅ All stage history records have users assigned!');
      await app.close();
      return;
    }

    // Get admin user as fallback
    const adminUser = await userRepo.findOne({
      where: { role: 'Admin' as any },
    });

    if (!adminUser) {
      console.error('❌ No admin user found. Please create an admin user first.');
      await app.close();
      return;
    }

    console.log('📊 Stage History Records Report:\n');
    console.log('━'.repeat(80));

    let fixed = 0;
    let skipped = 0;

    for (const history of historyWithoutUser) {
      const agreement = await agreementRepo.findOne({
        where: { id: history.agreementId },
        relations: ['createdBy'],
      });

      if (!agreement) {
        console.log(`⚠️  Skipping history ${history.id} - Agreement not found`);
        skipped++;
        continue;
      }

      // Try to determine the best user to assign
      let userToAssign: User | null = null;

      // 1. If agreement has a creator, use that
      if (agreement.createdById && agreement.createdBy) {
        userToAssign = agreement.createdBy;
        console.log(`📝 History ${history.id.substring(0, 8)}... | ${history.fromStage} → ${history.toStage}`);
        console.log(`   Agreement: ${agreement.agreementNumber || 'N/A'}`);
        console.log(`   Assigning to: ${userToAssign.name} (${userToAssign.email}) - Agreement Creator`);
      }
      // 2. For Draft creation, use the agreement creator
      else if (history.fromStage === history.toStage && history.toStage === 'Draft') {
        userToAssign = adminUser;
        console.log(`📝 History ${history.id.substring(0, 8)}... | ${history.fromStage} → ${history.toStage}`);
        console.log(`   Agreement: ${agreement.agreementNumber || 'N/A'}`);
        console.log(`   Assigning to: ${adminUser.name} (${adminUser.email}) - Admin (Fallback)`);
      }
      // 3. Otherwise use admin as fallback
      else {
        userToAssign = adminUser;
        console.log(`📝 History ${history.id.substring(0, 8)}... | ${history.fromStage} → ${history.toStage}`);
        console.log(`   Agreement: ${agreement.agreementNumber || 'N/A'}`);
        console.log(`   Assigning to: ${adminUser.name} (${adminUser.email}) - Admin (Fallback)`);
      }

      // Update the history record
      if (userToAssign) {
        history.changedById = userToAssign.id;
        await stageHistoryRepo.save(history);
        fixed++;
        console.log(`   ✅ Updated successfully\n`);
      } else {
        skipped++;
        console.log(`   ❌ Skipped - no suitable user found\n`);
      }
    }

    console.log('━'.repeat(80));
    console.log('\n📈 Summary:');
    console.log(`   ✅ Fixed: ${fixed}`);
    console.log(`   ⚠️  Skipped: ${skipped}`);
    console.log(`   📊 Total: ${historyWithoutUser.length}`);
    console.log('\n✨ Script completed successfully!');

  } catch (error) {
    console.error('❌ Error fixing stage history:', error);
  }

  await app.close();
}

fixStageHistoryUsers().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
