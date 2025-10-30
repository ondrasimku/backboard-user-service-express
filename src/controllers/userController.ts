import { injectable, inject } from 'inversify';
import { Response, NextFunction } from 'express';
import { AppError } from '../middlewares/errorHandler';
import { AuthenticatedRequest } from '../middlewares/auth';
import { IUserService } from '../services/userService';
import { UserResponseDto } from '../dto/user.dto';
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
      const users = await this.userService.getAllUsers();

      res.json(users.map((user) => this.mapToUserResponse(user)));
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
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
