import { DataSource } from 'typeorm';
import config from './config';
import { User } from '../models/user';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: config.database.host,
  port: config.database.port,
  username: config.database.username,
  password: config.database.password,
  database: config.database.database,
  synchronize: false,
  logging: false,
  entities: [User],
  migrations: ["migrations/*.ts"],
  migrationsTableName: "user_service_migrations",
  subscribers: [],
});

export default AppDataSource;

