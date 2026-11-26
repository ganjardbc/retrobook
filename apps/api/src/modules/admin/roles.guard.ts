import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Role } from '@prisma/client'
import { AppException } from '../../common/app-exception'
import type { AuthUser } from '../auth/current-user.decorator'
import { ROLES_KEY } from './roles.decorator'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!roles?.length) return true

    const user = context.switchToHttp().getRequest<{ user?: AuthUser }>().user
    if (user && roles.includes(user.role)) return true
    throw new AppException(403, 'FORBIDDEN', 'Administrators only')
  }
}
