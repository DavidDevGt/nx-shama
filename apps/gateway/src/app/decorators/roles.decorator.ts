import { SetMetadata } from '@nestjs/common';
import { Role } from '@nx-shama/contracts';

export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);