import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAvatarFields1764371999315 implements MigrationInterface {
    name = 'AddAvatarFields1764371999315'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "avatar_url" character varying`);
        await queryRunner.query(`ALTER TABLE "users" ADD "avatar_file_id" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "avatar_file_id"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "avatar_url"`);
    }

}

