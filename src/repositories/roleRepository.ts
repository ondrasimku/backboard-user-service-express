import { injectable, inject } from 'inversify';
import { Repository, DataSource } from 'typeorm';
import { Role } from '../models/role';
import { Permission } from '../models/permission';
import { TYPES } from '../types/di.types';

export interface IRoleRepository {
  findRoleById(id: string): Promise<Role | null>;
  findRoleByName(name: string): Promise<Role | null>;
  findAllRoles(): Promise<Role[]>;
  createRole(name: string, description?: string): Promise<Role>;
  updateRole(id: string, updates: { name?: string; description?: string }): Promise<Role | null>;
  deleteRole(id: string): Promise<boolean>;
  addPermissionToRole(roleId: string, permissionId: string): Promise<void>;
  removePermissionFromRole(roleId: string, permissionId: string): Promise<void>;
  getRoleWithPermissions(roleId: string): Promise<Role | null>;
  getRolePermissions(roleId: string): Promise<Permission[]>;
}

@injectable()
export class RoleRepository implements IRoleRepository {
  private roleRepository: Repository<Role>;
  private permissionRepository: Repository<Permission>;

  constructor(
    @inject(TYPES.DataSource) dataSource: DataSource,
  ) {
    this.roleRepository = dataSource.getRepository(Role);
    this.permissionRepository = dataSource.getRepository(Permission);
  }

  async findRoleById(id: string): Promise<Role | null> {
    return await this.roleRepository.findOne({ where: { id } });
  }

  async findRoleByName(name: string): Promise<Role | null> {
    return await this.roleRepository.findOne({ where: { name } });
  }

  async findAllRoles(): Promise<Role[]> {
    return await this.roleRepository.find({
      relations: ['permissions'],
    });
  }

  async createRole(name: string, description?: string): Promise<Role> {
    const role = this.roleRepository.create({ name, description: description || null });
    return await this.roleRepository.save(role);
  }

  async updateRole(id: string, updates: { name?: string; description?: string }): Promise<Role | null> {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) return null;

    if (updates.name !== undefined) role.name = updates.name;
    if (updates.description !== undefined) role.description = updates.description;

    return await this.roleRepository.save(role);
  }

  async deleteRole(id: string): Promise<boolean> {
    const result = await this.roleRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async addPermissionToRole(roleId: string, permissionId: string): Promise<void> {
    const role = await this.roleRepository.findOne({
      where: { id: roleId },
      relations: ['permissions'],
    });
    const permission = await this.permissionRepository.findOne({ where: { id: permissionId } });

    if (!role || !permission) {
      throw new Error('Role or permission not found');
    }

    if (!role.permissions) {
      role.permissions = [];
    }

    if (!role.permissions.some(p => p.id === permission.id)) {
      role.permissions.push(permission);
      await this.roleRepository.save(role);
    }
  }

  async removePermissionFromRole(roleId: string, permissionId: string): Promise<void> {
    const role = await this.roleRepository.findOne({
      where: { id: roleId },
      relations: ['permissions'],
    });

    if (!role || !role.permissions) {
      return;
    }

    role.permissions = role.permissions.filter(p => p.id !== permissionId);
    await this.roleRepository.save(role);
  }

  async getRoleWithPermissions(roleId: string): Promise<Role | null> {
    return await this.roleRepository.findOne({
      where: { id: roleId },
      relations: ['permissions'],
    });
  }

  async getRolePermissions(roleId: string): Promise<Permission[]> {
    const role = await this.getRoleWithPermissions(roleId);
    return role?.permissions || [];
  }
}

