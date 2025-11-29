import { MigrationInterface, QueryRunner } from "typeorm";

export class AddGoogleOauthFields1764376093266 implements MigrationInterface {
    name = 'AddGoogleOauthFields1764376093266'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Make password nullable for OAuth users
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL`);
        
        // Add google_id field (unique, nullable)
        await queryRunner.query(`ALTER TABLE "users" ADD "google_id" character varying`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_users_google_id" ON "users" ("google_id") WHERE "google_id" IS NOT NULL`);
        
        // Add auth_provider field (default: 'local')
        await queryRunner.query(`ALTER TABLE "users" ADD "auth_provider" character varying DEFAULT 'local'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "auth_provider"`);
        await queryRunner.query(`DROP INDEX "IDX_users_google_id"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "google_id"`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "password" SET NOT NULL`);
    }

}

