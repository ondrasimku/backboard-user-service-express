import { Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '../types/di.types';
import { IPermissionService } from '../services/permissionService';
import { PermissionResponseDto } from '../dto/permission.dto';
import { ILogger } from '../logging/logger.interface';

@injectable()
export class PermissionController {
  constructor(
    @inject(TYPES.PermissionService) private permissionService: IPermissionService,
    @inject(TYPES.Logger) private logger: ILogger,
  ) {}

  getAllPermissions = async (req: Request, res: Response): Promise<void> => {
    try {
      const permissions = await this.permissionService.getAllPermissions();
      const response: PermissionResponseDto[] = permissions.map(permission => ({
        id: permission.id,
        name: permission.name,
        description: permission.description,
        createdAt: permission.createdAt,
        updatedAt: permission.updatedAt,
      }));
      res.json(response);
    } catch (error) {
      this.logger.error('Error getting permissions', error as Error);
      throw error;
    }
  };

  getPermissionById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const permission = await this.permissionService.getPermissionById(id);
      if (!permission) {
        res.status(404).json({ error: 'Permission not found' });
        return;
      }

      const response: PermissionResponseDto = {
        id: permission.id,
        name: permission.name,
        description: permission.description,
        createdAt: permission.createdAt,
        updatedAt: permission.updatedAt,
      };
      res.json(response);
    } catch (error) {
      this.logger.error('Error getting permission', error as Error);
      throw error;
    }
  };
}

