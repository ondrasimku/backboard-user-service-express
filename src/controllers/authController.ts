import { injectable, inject } from 'inversify';
import { Request, Response, NextFunction } from 'express';
import { IAuthService } from '../services/authService';
import { RegisterDto, LoginDto } from '../dto/user.dto';
import { TYPES } from '../types/di.types';

@injectable()
export class AuthController {
  constructor(
    @inject(TYPES.AuthService) private authService: IAuthService,
  ) {}

  register = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const registerDto = req.body as RegisterDto;

      if (!registerDto.email || !registerDto.password || !registerDto.firstName || !registerDto.lastName) {
        res.status(400).json({ message: 'Email, password, firstName, and lastName are required' });
        return;
      }

      const result = await this.authService.register(registerDto);

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  };

  login = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const loginDto = req.body as LoginDto;

      if (!loginDto.email || !loginDto.password) {
        res.status(400).json({ message: 'Email and password are required' });
        return;
      }

      const result = await this.authService.login(loginDto);

      res.json(result);
    } catch (error) {
      next(error);
    }
  };
}

