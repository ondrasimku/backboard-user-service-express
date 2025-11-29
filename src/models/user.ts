import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany, JoinTable } from 'typeorm';
import { Role } from './role';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ nullable: true, type: 'varchar' })
  password!: string | null;

  @Column({ name: 'first_name' })
  firstName!: string;

  @Column({ name: 'last_name' })
  lastName!: string;

  @Column({ name: 'email_verified', default: false })
  emailVerified!: boolean;

  @Column({ name: 'email_verification_token', nullable: true, type: 'varchar' })
  emailVerificationToken!: string | null;

  @Column({ name: 'password_reset_token', nullable: true, type: 'varchar' })
  passwordResetToken!: string | null;

  @Column({ name: 'password_reset_token_expires_at', nullable: true, type: 'timestamp' })
  passwordResetTokenExpiresAt!: Date | null;

  @Column({ name: 'organization_id', nullable: true, type: 'uuid' })
  organizationId!: string | null;

  @Column({ name: 'avatar_url', nullable: true, type: 'varchar' })
  avatarUrl!: string | null;

  @Column({ name: 'avatar_file_id', nullable: true, type: 'varchar' })
  avatarFileId!: string | null;

  @Column({ name: 'google_id', nullable: true, unique: true, type: 'varchar' })
  googleId!: string | null;

  @Column({ name: 'auth_provider', nullable: true, default: 'local', type: 'varchar' })
  authProvider!: 'local' | 'google';

  @ManyToMany(() => Role, role => role.users)
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles!: Role[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

export default User;
