import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../modules/users/users.service';
import { UserRole } from '../entities/user.entity';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  const users = [
    {
      name: 'Account Manager',
      email: 'accountmgr@company.com',
      password: 'password123',
      role: UserRole.ACCOUNT_MANAGER,
      department: 'Sales',
      phone: '+91-9876543201',
    },
    {
      name: 'Sales Manager',
      email: 'salesmgr@company.com',
      password: 'password123',
      role: UserRole.SALES_MANAGER,
      department: 'Sales',
      phone: '+91-9876543202',
    },
    {
      name: 'Presales Team',
      email: 'presales@company.com',
      password: 'password123',
      role: UserRole.PRESALES,
      department: 'Sales',
      phone: '+91-9876543203',
    },
    {
      name: 'Delivery Manager',
      email: 'delivery@company.com',
      password: 'password123',
      role: UserRole.DELIVERY_MANAGER,
      department: 'Delivery',
      phone: '+91-9876543204',
    },
    {
      name: 'Legal Team',
      email: 'legal@company.com',
      password: 'password123',
      role: UserRole.LEGAL,
      department: 'Legal',
      phone: '+91-9876543205',
    },
    {
      name: 'Finance Team',
      email: 'finance@company.com',
      password: 'password123',
      role: UserRole.FINANCE,
      department: 'Finance',
      phone: '+91-9876543206',
    },
    {
      name: 'Procurement Team',
      email: 'procurement@company.com',
      password: 'password123',
      role: UserRole.PROCUREMENT,
      department: 'Procurement',
      phone: '+91-9876543207',
    },
    {
      name: 'CEO',
      email: 'ceo@company.com',
      password: 'password123',
      role: UserRole.CEO,
      department: 'Executive',
      phone: '+91-9876543208',
    },
    {
      name: 'ULCCS Approver',
      email: 'ulccs@company.com',
      password: 'password123',
      role: UserRole.ULCCS_APPROVER,
      department: 'Compliance',
      phone: '+91-9876543209',
    },
    {
      name: 'System Administrator',
      email: 'admin@example.com',
      password: 'password123',
      role: UserRole.ADMIN,
      department: 'IT',
      phone: '+91-9876543210',
    },
  ];

  for (const userData of users) {
    try {
      const existingUser = await usersService.findByEmail(userData.email);
      if (!existingUser) {
        await usersService.create(userData);
        console.log(`✓ Created user: ${userData.email} (${userData.role})`);
      } else {
        console.log(
          `○ User already exists: ${userData.email} (${userData.role})`,
        );
      }
    } catch (error) {
      console.error(`✗ Error creating user ${userData.email}:`, error.message);
    }
  }

  await app.close();
  console.log('\n========================================');
  console.log('✅ SEEDING COMPLETED!');
  console.log('========================================');
  console.log('\n📋 Demo Users Created (SRS_DEMO_FLOW):');
  console.log('─────────────────────────────────────────');
  console.log('Account Manager:    accountmgr@company.com');
  console.log('Sales Manager:      salesmgr@company.com');
  console.log('Presales:           presales@company.com');
  console.log('Delivery Manager:   delivery@company.com');
  console.log('Legal Team:         legal@company.com');
  console.log('Finance Team:       finance@company.com');
  console.log('Procurement:        procurement@company.com');
  console.log('CEO:                ceo@company.com');
  console.log('ULCCS Approver:     ulccs@company.com');
  console.log('Admin:              admin@example.com');
  console.log('─────────────────────────────────────────');
  console.log('🔑 Password for all: password123');
  console.log('========================================');
  console.log('\n💡 Run the demo following SRS_DEMO_FLOW.md');
  console.log('========================================\n');
}

seed().catch(console.error);
