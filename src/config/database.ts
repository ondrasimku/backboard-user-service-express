import { DataSource } from 'typeorm';
import config from './config';
import { User } from '../models/user';
import { Role } from '../models/role';
import { Permission } from '../models/permission';

const AppDataSource = new DataSource({
  type: 'postgres',
  host: config.database.host,
  port: config.database.port,
  username: config.database.username,
  password: config.database.password,
  database: config.database.database,
  synchronize: false,
  logging: false,
  entities: [User, Role, Permission],
  migrations: [__dirname + "/../migrations/*.{ts,js}"],
  migrationsTableName: "user_service_migrations",
  subscribers: [],
});

export default AppDataSource;

