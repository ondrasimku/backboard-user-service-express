import { injectable, inject } from 'inversify';
import { IPermissionRepository } from '../repositories/permissionRepository';
import { TYPES } from '../types/di.types';
import { ILogger } from '../logging/logger.interface';
import { Permission } from '../models/permission';
import { ALL_PERMISSIONS, PERMISSION_DESCRIPTIONS } from '../config/permissions';

export interface IPermissionService {
  getAllPermissions(): Promise<Permission[]>;
  getPermissionById(id: string): Promise<Permission | null>;
  getPermissionByName(name: string): Promise<Permission | null>;
  ensurePermissionsExist(): Promise<void>;
}

@injectable()
export class PermissionService implements IPermissionService {
  constructor(
    @inject(TYPES.PermissionRepository) private permissionRepository: IPermissionRepository,
    @inject(TYPES.Logger) private logger: ILogger,
  ) {}

  async getAllPermissions(): Promise<Permission[]> {
    return await this.permissionRepository.findAllPermissions();
  }

  async getPermissionById(id: string): Promise<Permission | null> {
    return await this.permissionRepository.findPermissionById(id);
  }

  async getPermissionByName(name: string): Promise<Permission | null> {
    return await this.permissionRepository.findPermissionByName(name);
  }

  async ensurePermissionsExist(): Promise<void> {
    this.logger.info('Ensuring all permissions exist in database');

    for (const permissionName of ALL_PERMISSIONS) {
      const description = PERMISSION_DESCRIPTIONS[permissionName] || undefined;
      await this.permissionRepository.findOrCreatePermission(permissionName, description);
    }

    this.logger.info('All permissions ensured', { count: ALL_PERMISSIONS.length });
  }
}

