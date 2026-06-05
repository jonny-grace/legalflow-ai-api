import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, Role } from '../../common/decorators/roles.decorator';
import { JwtPayload } from '../../common/decorators/current-user.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get the roles required by the @Roles() decorator on this route
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no @Roles() decorator, allow any authenticated user
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Get user from request (attached by JwtStrategy)
    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;

    if (!user) {
      throw new ForbiddenException(
        'You do not have permission to access this resource.',
      );
    }

    // Check if user role matches any required role
    const hasRole = requiredRoles.some((role) => user.role === role);

    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied. This action requires one of these roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
