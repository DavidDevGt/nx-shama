import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get('JWT_SECRET'),
      ignoreExpiration: false,
    });
  }

  async validate(payload: JwtPayload): Promise<any> {
    // Mock user validation - in production, query user database
    const mockUsers = {
      'user-1': { id: 'user-1', email: 'admin@test.com', roles: ['ADMIN'], active: true },
      'user-2': { id: 'user-2', email: 'sales@test.com', roles: ['SALES'], active: true },
    };

    const user = mockUsers[payload.sub];
    if (!user || !user.active) {
      throw new UnauthorizedException('Usuario no encontrado o inactivo');
    }

    if (!payload.roles?.length) {
      throw new UnauthorizedException('Roles requeridos');
    }

    // Verify roles match
    const hasValidRoles = payload.roles.every(role => user.roles.includes(role));
    if (!hasValidRoles) {
      throw new UnauthorizedException('Roles inválidos');
    }

    return {
      id: user.id,
      email: user.email,
      roles: payload.roles,
    };
  }
}