import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveUserRoleColumn1764444848757 implements MigrationInterface {
    name = 'RemoveUserRoleColumn1764444848757'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "role"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "role" character varying DEFAULT 'user'`);
    }
}

