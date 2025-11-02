import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { UsersService } from '../modules/users/users.service';
import { UserRole } from '../entities/user.entity';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  const users = [
    {
      name: 'User One',
      email: 'user1@gmail.com',
      password: 'password@123',
      role: UserRole.SALES_EXECUTIVE,
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
        console.log(`Created user: ${userData.email}`);
      } else {
        console.log(`User already exists: ${userData.email}`);
      }
    } catch (error) {
      console.error(`Error creating user ${userData.email}:`, error.message);
    }
  }

  await app.close();
  console.log('Seeding completed!');
}

seed().catch(console.error);