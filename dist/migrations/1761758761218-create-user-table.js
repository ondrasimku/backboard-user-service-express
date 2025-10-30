"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateUserTable1761758761218 = void 0;
class CreateUserTable1761758761218 {
    constructor() {
        this.name = 'CreateUserTable1761758761218';
    }
    async up(queryRunner) {
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "password" character varying NOT NULL, "first_name" character varying NOT NULL, "last_name" character varying NOT NULL, "email_verified" boolean NOT NULL DEFAULT false, "role" character varying DEFAULT 'user', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE "users"`);
    }
}
exports.CreateUserTable1761758761218 = CreateUserTable1761758761218;
