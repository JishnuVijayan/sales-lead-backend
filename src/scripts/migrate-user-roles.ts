import { DataSource } from 'typeorm';
import { User } from '../entities/user.entity';

/**
 * Migration script to update user roles from old to new naming convention
 * Run this manually: ts-node src/scripts/migrate-user-roles.ts
 */
export async function migrateUserRoles(dataSource: DataSource) {
  console.log('Starting user roles migration...');

  const userRepo = dataSource.getRepository(User);

  try {
    // Rename Sales Executive to Account Manager
    const salesExecutives = await userRepo
      .createQueryBuilder()
      .update(User)
      .set({ role: 'Account Manager' as any })
      .where("role = 'Sales Executive'")
      .execute();

    console.log(
      `✓ Migrated ${salesExecutives.affected} Sales Executive users to Account Manager`,
    );

    // Rename Operations to Delivery Manager
    const operations = await userRepo
      .createQueryBuilder()
      .update(User)
      .set({ role: 'Delivery Manager' as any })
      .where("role = 'Operations'")
      .execute();

    console.log(
      `✓ Migrated ${operations.affected} Operations users to Delivery Manager`,
    );

    // Rename Accounts to Finance
    const accounts = await userRepo
      .createQueryBuilder()
      .update(User)
      .set({ role: 'Finance' as any })
      .where("role = 'Accounts'")
      .execute();

    console.log(`✓ Migrated ${accounts.affected} Accounts users to Finance`);

    // Rename Pre Sales to Presales
    const preSales = await userRepo
      .createQueryBuilder()
      .update(User)
      .set({ role: 'Presales' as any })
      .where("role = 'Pre Sales'")
      .execute();

    console.log(`✓ Migrated ${preSales.affected} Pre Sales users to Presales`);

    console.log('✓ User roles migration completed successfully!');

    // Verify migration
    const allUsers = await userRepo.find();
    console.log('\nCurrent role distribution:');
    const roleCount: Record<string, number> = {};
    allUsers.forEach((user) => {
      roleCount[user.role] = (roleCount[user.role] || 0) + 1;
    });
    console.table(roleCount);
  } catch (error) {
    console.error('✗ Error during migration:', error);
    throw error;
  }
}

// If running directly
if (require.main === module) {
  const { AppDataSource } = require('../data-source'); // You may need to create this

  AppDataSource.initialize()
    .then(async (dataSource: DataSource) => {
      await migrateUserRoles(dataSource);
      await dataSource.destroy();
      process.exit(0);
    })
    .catch((error: any) => {
      console.error('Failed to initialize data source:', error);
      process.exit(1);
    });
}
