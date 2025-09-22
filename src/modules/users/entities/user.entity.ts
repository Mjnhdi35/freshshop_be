import { Entity, Column } from 'typeorm';
import { Exclude } from 'class-transformer';
import { BaseEntity } from '../../../common/entities/base.entity';

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  @Exclude()
  password: string;

  @Column({ name: 'google_id', nullable: true, unique: true })
  googleId?: string;

  @Column({ name: 'display_name', nullable: true })
  displayName?: string;

  @Column({ nullable: true })
  avatar?: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;
}
