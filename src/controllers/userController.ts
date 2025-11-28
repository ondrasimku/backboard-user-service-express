import { injectable, inject } from 'inversify';
import { Response, NextFunction } from 'express';
import { AppError } from '../middlewares/errorHandler';
import { AuthenticatedRequest } from '../middlewares/auth';
import { IUserService } from '../services/userService';
import { UserResponseDto, UpdateUserProfileDto, SetAvatarDto } from '../dto/user.dto';
import { PaginatedResponse, PaginationParams } from '../dto/pagination.dto';
import { TYPES } from '../types/di.types';

@injectable()
export class UserController {
  constructor(
    @inject(TYPES.UserService) private userService: IUserService,
  ) {}

  getCurrentUser = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      const user = await this.userService.getUserById(req.user.userId);

      if (!user) {
        res.status(404).json({ message: 'User not found. Please contact support.' });
        return;
      }

      res.json(this.mapToUserResponse(user));
    } catch (error) {
      next(error);
    }
  };

  getUserById = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { id } = req.params;

      const user = await this.userService.getUserById(id);

      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      res.json(this.mapToUserResponse(user));
    } catch (error) {
      next(error);
    }
  };

  getAllUsers = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      if (page < 1) {
        throw new AppError('Page must be greater than 0', 400);
      }

      if (limit < 1 || limit > 100) {
        throw new AppError('Limit must be between 1 and 100', 400);
      }

      const pagination: PaginationParams = { page, limit };
      const result = await this.userService.getPaginatedUsers(pagination);

      const response: PaginatedResponse<UserResponseDto> = {
        data: result.data.map((user) => this.mapToUserResponse(user)),
        meta: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
        },
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  };

  updateCurrentUserProfile = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      const profileData: UpdateUserProfileDto = req.body;

      if (profileData.firstName !== undefined && typeof profileData.firstName !== 'string') {
        throw new AppError('firstName must be a string', 400);
      }

      if (profileData.lastName !== undefined && typeof profileData.lastName !== 'string') {
        throw new AppError('lastName must be a string', 400);
      }

      if (profileData.firstName !== undefined && profileData.firstName.trim().length === 0) {
        throw new AppError('firstName cannot be empty', 400);
      }

      if (profileData.lastName !== undefined && profileData.lastName.trim().length === 0) {
        throw new AppError('lastName cannot be empty', 400);
      }

      if (profileData.firstName === undefined && profileData.lastName === undefined) {
        throw new AppError('At least one field (firstName or lastName) must be provided', 400);
      }

      const updatedUser = await this.userService.updateUserProfile(req.user.userId, profileData);

      if (!updatedUser) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      res.json(this.mapToUserResponse(updatedUser));
    } catch (error) {
      next(error);
    }
  };

  setAvatar = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new AppError('User not authenticated', 401);
      }

      const avatarData: SetAvatarDto = req.body;

      if (!avatarData.fileId || typeof avatarData.fileId !== 'string' || avatarData.fileId.trim().length === 0) {
        throw new AppError('fileId is required and cannot be empty', 400);
      }

      if (!avatarData.avatarUrl || typeof avatarData.avatarUrl !== 'string' || avatarData.avatarUrl.trim().length === 0) {
        throw new AppError('avatarUrl is required and cannot be empty', 400);
      }

      const updatedUser = await this.userService.setUserAvatar(
        req.user.userId,
        avatarData.fileId,
        avatarData.avatarUrl,
      );

      if (!updatedUser) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      res.json(this.mapToUserResponse(updatedUser));
    } catch (error) {
      next(error);
    }
  };

  getMetrics = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const metrics = await this.userService.getUserMetrics();
      res.json(metrics);
    } catch (error) {
      next(error);
    }
  };

  private mapToUserResponse(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    emailVerified: boolean;
    role: string;
    avatarUrl?: string | null;
    avatarFileId?: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      emailVerified: user.emailVerified,
      role: user.role,
      avatarUrl: user.avatarUrl ?? null,
      avatarFileId: user.avatarFileId ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
