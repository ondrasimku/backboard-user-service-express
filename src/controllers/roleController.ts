import { Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '../types/di.types';
import { IRoleService } from '../services/roleService';
import { IUserRepository } from '../repositories/userRepository';
import { CreateRoleDto, UpdateRoleDto, RoleResponseDto, AssignPermissionToRoleDto, AssignRoleToUserDto } from '../dto/role.dto';
import { ILogger } from '../logging/logger.interface';
import { AppError } from '../middlewares/errorHandler';

@injectable()
export class RoleController {
  constructor(
    @inject(TYPES.RoleService) private roleService: IRoleService,
    @inject(TYPES.UserRepository) private userRepository: IUserRepository,
    @inject(TYPES.Logger) private logger: ILogger,
  ) {}

  getAllRoles = async (req: Request, res: Response): Promise<void> => {
    try {
      const roles = await this.roleService.getAllRoles();
      const response: RoleResponseDto[] = roles.map(role => ({
        id: role.id,
        name: role.name,
        description: role.description,
        permissions: role.permissions?.map(p => p.name) || [],
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
      }));
      res.json(response);
    } catch (error) {
      this.logger.error('Error getting roles', error as Error);
      throw error;
    }
  };

  getRoleById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const role = await this.roleService.getRoleById(id);
      if (!role) {
        throw new AppError('Role not found', 404);
      }

      const permissions = await this.roleService.getRolePermissions(id);
      const response: RoleResponseDto = {
        id: role.id,
        name: role.name,
        description: role.description,
        permissions,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
      };
      res.json(response);
    } catch (error) {
      this.logger.error('Error getting role', error as Error);
      throw error;
    }
  };

  createRole = async (req: Request, res: Response): Promise<void> => {
    try {
      const dto: CreateRoleDto = req.body;
      const role = await this.roleService.createRole(dto.name, dto.description);
      const response: RoleResponseDto = {
        id: role.id,
        name: role.name,
        description: role.description,
        permissions: [],
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
      };
      res.status(201).json(response);
    } catch (error) {
      this.logger.error('Error creating role', error as Error);
      throw error;
    }
  };

  updateRole = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const dto: UpdateRoleDto = req.body;
      const role = await this.roleService.updateRole(id, dto);
      if (!role) {
        throw new AppError('Role not found', 404);
      }

      const permissions = await this.roleService.getRolePermissions(id);
      const response: RoleResponseDto = {
        id: role.id,
        name: role.name,
        description: role.description,
        permissions,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
      };
      res.json(response);
    } catch (error) {
      this.logger.error('Error updating role', error as Error);
      throw error;
    }
  };

  deleteRole = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await this.roleService.deleteRole(id);
      res.status(204).send();
    } catch (error) {
      this.logger.error('Error deleting role', error as Error);
      throw error;
    }
  };

  addPermissionToRole = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const dto: AssignPermissionToRoleDto = req.body;
      await this.roleService.addPermissionToRole(id, dto.permissionId);
      res.status(204).send();
    } catch (error) {
      this.logger.error('Error adding permission to role', error as Error);
      throw error;
    }
  };

  removePermissionFromRole = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, permissionId } = req.params;
      await this.roleService.removePermissionFromRole(id, permissionId);
      res.status(204).send();
    } catch (error) {
      this.logger.error('Error removing permission from role', error as Error);
      throw error;
    }
  };

  assignRoleToUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const dto: AssignRoleToUserDto = req.body;
      await this.userRepository.addRoleToUser(userId, dto.roleId);
      res.status(204).send();
    } catch (error) {
      this.logger.error('Error assigning role to user', error as Error);
      throw error;
    }
  };

  removeRoleFromUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, roleId } = req.params;
      await this.userRepository.removeRoleFromUser(userId, roleId);
      res.status(204).send();
    } catch (error) {
      this.logger.error('Error removing role from user', error as Error);
      throw error;
    }
  };

  getUserRoles = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const user = await this.userRepository.findUserWithRoles(userId);
      
      if (!user) {
        throw new AppError('User not found', 404);
      }

      const response: RoleResponseDto[] = (user.roles || []).map(role => ({
        id: role.id,
        name: role.name,
        description: role.description,
        permissions: role.permissions?.map(p => p.name) || [],
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
      }));

      res.json(response);
    } catch (error) {
      this.logger.error('Error getting user roles', error as Error);
      throw error;
    }
  };
}

