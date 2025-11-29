import { injectable, inject } from 'inversify';
import { Repository, DataSource } from 'typeorm';
import { Permission } from '../models/permission';
import { TYPES } from '../types/di.types';

export interface IPermissionRepository {
  findPermissionById(id: string): Promise<Permission | null>;
  findPermissionByName(name: string): Promise<Permission | null>;
  findAllPermissions(): Promise<Permission[]>;
  createPermission(name: string, description?: string): Promise<Permission>;
  findOrCreatePermission(name: string, description?: string): Promise<Permission>;
}

@injectable()
export class PermissionRepository implements IPermissionRepository {
  private permissionRepository: Repository<Permission>;

  constructor(
    @inject(TYPES.DataSource) dataSource: DataSource,
  ) {
    this.permissionRepository = dataSource.getRepository(Permission);
  }

  async findPermissionById(id: string): Promise<Permission | null> {
    return await this.permissionRepository.findOne({ where: { id } });
  }

  async findPermissionByName(name: string): Promise<Permission | null> {
    return await this.permissionRepository.findOne({ where: { name } });
  }

  async findAllPermissions(): Promise<Permission[]> {
    return await this.permissionRepository.find();
  }

  async createPermission(name: string, description?: string): Promise<Permission> {
    const permission = this.permissionRepository.create({ name, description: description || null });
    return await this.permissionRepository.save(permission);
  }

  async findOrCreatePermission(name: string, description?: string): Promise<Permission> {
    let permission = await this.findPermissionByName(name);
    if (!permission) {
      permission = await this.createPermission(name, description);
    }
    return permission;
  }
}

