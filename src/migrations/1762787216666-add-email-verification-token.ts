import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEmailVerificationToken1762787216666 implements MigrationInterface {
    name = 'AddEmailVerificationToken1762787216666'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "email_verification_token" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "email_verification_token"`);
    }

}

