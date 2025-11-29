import { injectable, inject } from 'inversify';
import { IRoleRepository } from '../repositories/roleRepository';
import { IPermissionRepository } from '../repositories/permissionRepository';
import { TYPES } from '../types/di.types';
import { ILogger } from '../logging/logger.interface';
import { AppError } from '../middlewares/errorHandler';
import { Role } from '../models/role';

export interface IRoleService {
  getAllRoles(): Promise<Role[]>;
  getRoleById(id: string): Promise<Role | null>;
  createRole(name: string, description?: string): Promise<Role>;
  updateRole(id: string, updates: { name?: string; description?: string }): Promise<Role | null>;
  deleteRole(id: string): Promise<void>;
  addPermissionToRole(roleId: string, permissionId: string): Promise<void>;
  removePermissionFromRole(roleId: string, permissionId: string): Promise<void>;
  getRolePermissions(roleId: string): Promise<string[]>;
}

@injectable()
export class RoleService implements IRoleService {
  constructor(
    @inject(TYPES.RoleRepository) private roleRepository: IRoleRepository,
    @inject(TYPES.PermissionRepository) private permissionRepository: IPermissionRepository,
    @inject(TYPES.Logger) private logger: ILogger,
  ) {}

  async getAllRoles(): Promise<Role[]> {
    return await this.roleRepository.findAllRoles();
  }

  async getRoleById(id: string): Promise<Role | null> {
    return await this.roleRepository.findRoleById(id);
  }

  async createRole(name: string, description?: string): Promise<Role> {
    this.logger.info('Creating role', { name });

    const existingRole = await this.roleRepository.findRoleByName(name);
    if (existingRole) {
      this.logger.warn('Role creation failed: role already exists', { name });
      throw new AppError('Role with this name already exists', 400);
    }

    const role = await this.roleRepository.createRole(name, description);
    this.logger.info('Role created successfully', { roleId: role.id, name });
    return role;
  }

  async updateRole(id: string, updates: { name?: string; description?: string }): Promise<Role | null> {
    this.logger.info('Updating role', { roleId: id, updates });

    if (updates.name) {
      const existingRole = await this.roleRepository.findRoleByName(updates.name);
      if (existingRole && existingRole.id !== id) {
        this.logger.warn('Role update failed: role name already exists', { name: updates.name });
        throw new AppError('Role with this name already exists', 400);
      }
    }

    const role = await this.roleRepository.updateRole(id, updates);
    if (!role) {
      this.logger.warn('Role update failed: role not found', { roleId: id });
      throw new AppError('Role not found', 404);
    }

    this.logger.info('Role updated successfully', { roleId: id });
    return role;
  }

  async deleteRole(id: string): Promise<void> {
    this.logger.info('Deleting role', { roleId: id });

    const deleted = await this.roleRepository.deleteRole(id);
    if (!deleted) {
      this.logger.warn('Role deletion failed: role not found', { roleId: id });
      throw new AppError('Role not found', 404);
    }

    this.logger.info('Role deleted successfully', { roleId: id });
  }

  async addPermissionToRole(roleId: string, permissionId: string): Promise<void> {
    this.logger.info('Adding permission to role', { roleId, permissionId });

    const permission = await this.permissionRepository.findPermissionById(permissionId);
    if (!permission) {
      throw new AppError('Permission not found', 404);
    }

    await this.roleRepository.addPermissionToRole(roleId, permissionId);
    this.logger.info('Permission added to role successfully', { roleId, permissionId });
  }

  async removePermissionFromRole(roleId: string, permissionId: string): Promise<void> {
    this.logger.info('Removing permission from role', { roleId, permissionId });

    await this.roleRepository.removePermissionFromRole(roleId, permissionId);
    this.logger.info('Permission removed from role successfully', { roleId, permissionId });
  }

  async getRolePermissions(roleId: string): Promise<string[]> {
    const permissions = await this.roleRepository.getRolePermissions(roleId);
    return permissions.map(p => p.name);
  }
}

