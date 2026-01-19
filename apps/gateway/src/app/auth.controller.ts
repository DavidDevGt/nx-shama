import { Controller, Post, Body } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@nx-shama/contracts';

@Controller('auth')
export class AuthController {
  constructor(private readonly jwtService: JwtService) {}

  @Post('login')
  async login(@Body() loginDto: { email: string; password: string }) {
    // TODO: Validate credentials against database
    // For demo purposes, accept any email/password and assign roles based on email

    let roles: Role[] = [Role.READONLY];
    if (loginDto.email.includes('admin')) {
      roles = [Role.ADMIN];
    } else if (loginDto.email.includes('sales')) {
      roles = [Role.SALES];
    }

    const payload = {
      sub: 'user-1', // TODO: Get from DB
      email: loginDto.email,
      roles,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: 'user-1',
        email: loginDto.email,
        roles,
      },
    };
  }
}