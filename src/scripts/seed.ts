import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../modules/users/users.service';
import { UserRole } from '../entities/user.entity';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  const users = [
    {
      name: 'Admin User',
      email: 'admin@company.com',
      password: 'password@123',
      role: UserRole.ADMIN,
      department: 'IT',
      phone: '+1-555-0001',
    },
    {
      name: 'John Smith',
      email: 'john.smith@company.com',
      password: 'password@123',
      role: UserRole.ACCOUNT_MANAGER,
      department: 'Sales',
      phone: '+1-555-0002',
    },
    {
      name: 'Sarah Johnson',
      email: 'sarah.johnson@company.com',
      password: 'password@123',
      role: UserRole.SALES_MANAGER,
      department: 'Sales',
      phone: '+1-555-0003',
    },
    {
      name: 'Michael Chen',
      email: 'michael.chen@company.com',
      password: 'password@123',
      role: UserRole.PRESALES,
      department: 'Sales',
      phone: '+1-555-0004',
    },
    {
      name: 'Emily Davis',
      email: 'emily.davis@company.com',
      password: 'password@123',
      role: UserRole.DELIVERY_MANAGER,
      department: 'Delivery',
      phone: '+1-555-0005',
    },
    {
      name: 'David Wilson',
      email: 'david.wilson@company.com',
      password: 'password@123',
      role: UserRole.PROCUREMENT,
      department: 'Procurement',
      phone: '+1-555-0006',
    },
    {
      name: 'Jennifer Brown',
      email: 'jennifer.brown@company.com',
      password: 'password@123',
      role: UserRole.FINANCE,
      department: 'Finance',
      phone: '+1-555-0007',
    },
    {
      name: 'Robert Martinez',
      email: 'robert.martinez@company.com',
      password: 'password@123',
      role: UserRole.LEGAL,
      department: 'Legal',
      phone: '+1-555-0008',
    },
    {
      name: 'James Anderson',
      email: 'james.anderson@company.com',
      password: 'password@123',
      role: UserRole.CEO,
      department: 'Executive',
      phone: '+1-555-0009',
    },
    {
      name: 'Lisa Taylor',
      email: 'lisa.taylor@company.com',
      password: 'password@123',
      role: UserRole.ULCCS_APPROVER,
      department: 'Compliance',
      phone: '+1-555-0010',
    },
    // Backward compatibility - keep original test accounts
    {
      name: 'User One',
      email: 'user1@gmail.com',
      password: 'password@123',
      role: UserRole.ACCOUNT_MANAGER,
    },
    {
      name: 'User Two',
      email: 'user2@gmail.com',
      password: 'password@123',
      role: UserRole.SALES_MANAGER,
    },
    {
      name: 'User Three',
      email: 'user3@gmail.com',
      password: 'password@123',
      role: UserRole.ADMIN,
    },
  ];

  for (const userData of users) {
    try {
      const existingUser = await usersService.findByEmail(userData.email);
      if (!existingUser) {
        await usersService.create(userData);
        console.log(`✓ Created user: ${userData.email} (${userData.role})`);
      } else {
        console.log(`○ User already exists: ${userData.email} (${userData.role})`);
      }
    } catch (error) {
      console.error(`✗ Error creating user ${userData.email}:`, error.message);
    }
  }

  await app.close();
  console.log('\n========================================');
  console.log('Seeding completed!');
  console.log('========================================');
  console.log('\nTest Users Created:');
  console.log('─────────────────────────────────────────');
  console.log('Admin:              admin@company.com');
  console.log('Account Manager:    john.smith@company.com');
  console.log('Sales Manager:      sarah.johnson@company.com');
  console.log('Presales:           michael.chen@company.com');
  console.log('Delivery Manager:   emily.davis@company.com');
  console.log('Procurement:        david.wilson@company.com');
  console.log('Finance:            jennifer.brown@company.com');
  console.log('Legal:              robert.martinez@company.com');
  console.log('CEO:                james.anderson@company.com');
  console.log('ULCCS Approver:     lisa.taylor@company.com');
  console.log('─────────────────────────────────────────');
  console.log('Password for all:   password@123');
  console.log('========================================\n');
}

seed().catch(console.error);