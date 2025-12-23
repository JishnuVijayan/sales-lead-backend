import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum UserRole {
  ADMIN = 'Admin',
  ACCOUNT_MANAGER = 'Account Manager',
  SALES_MANAGER = 'Sales Manager',
  PRESALES = 'Presales',
  DELIVERY_MANAGER = 'Delivery Manager',
  FINANCE = 'Finance',
  LEGAL = 'Legal',
  PROCUREMENT = 'Procurement',
  CEO = 'CEO',
  ULCCS_APPROVER = 'ULCCS Approver',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.ACCOUNT_MANAGER,
  })
  role: UserRole;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  department: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_date' })
  createdDate: Date;
}
