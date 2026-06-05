import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }

  // Override to provide a clearer error message
  handleRequest<TUser = unknown>(
    err: Error,
    user: TUser,
    info: { message?: string },
  ): TUser {
    if (err || !user) {
      // Token expired
      if (info?.message === 'jwt expired') {
        throw new UnauthorizedException(
          'Your session has expired. Please log in again.',
        );
      }

      // No token provided
      if (info?.message === 'No auth token') {
        throw new UnauthorizedException(
          'Authentication required. Please log in.',
        );
      }

      // Invalid token
      throw new UnauthorizedException(
        'Invalid authentication token. Please log in again.',
      );
    }

    return user;
  }
}
