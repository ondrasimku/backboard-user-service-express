import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAuthTables1764437231967 implements MigrationInterface {
    name = 'AddAuthTables1764437231967'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "organization_id" uuid`);

        await queryRunner.query(`
            CREATE TABLE "roles" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "description" text,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_roles_name" UNIQUE ("name"),
                CONSTRAINT "PK_roles" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "permissions" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "name" character varying NOT NULL,
                "description" text,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_permissions_name" UNIQUE ("name"),
                CONSTRAINT "PK_permissions" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "user_roles" (
                "user_id" uuid NOT NULL,
                "role_id" uuid NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_user_roles" PRIMARY KEY ("user_id", "role_id"),
                CONSTRAINT "FK_user_roles_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_user_roles_role_id" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE
            )
        `);

        await queryRunner.query(`
            CREATE TABLE "role_permissions" (
                "role_id" uuid NOT NULL,
                "permission_id" uuid NOT NULL,
                CONSTRAINT "PK_role_permissions" PRIMARY KEY ("role_id", "permission_id"),
                CONSTRAINT "FK_role_permissions_role_id" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_role_permissions_permission_id" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE
            )
        `);

        await queryRunner.query(`CREATE INDEX "IDX_user_roles_user_id" ON "user_roles" ("user_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_user_roles_role_id" ON "user_roles" ("role_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_role_permissions_role_id" ON "role_permissions" ("role_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_role_permissions_permission_id" ON "role_permissions" ("permission_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_users_organization_id" ON "users" ("organization_id")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_organization_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_role_permissions_permission_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_role_permissions_role_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_roles_role_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_roles_user_id"`);

        await queryRunner.query(`DROP TABLE IF EXISTS "role_permissions"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "user_roles"`);

        await queryRunner.query(`DROP TABLE IF EXISTS "permissions"`);
        await queryRunner.query(`DROP TABLE IF EXISTS "roles"`);

        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "organization_id"`);
    }
}

