import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtService } from '@nestjs/jwt';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: JwtService;

  const mockJwtService = {
    verifyAsync: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should return true for valid JWT token', async () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer valid.jwt.token',
        },
      };

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      const mockPayload = {
        sub: 'user-123',
        email: 'user@test.com',
        roles: ['ADMIN'],
        iat: Date.now() / 1000,
        exp: (Date.now() / 1000) + 3600,
      };

      mockJwtService.verifyAsync.mockResolvedValue(mockPayload);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('valid.jwt.token');
      expect(mockRequest['user']).toEqual(mockPayload);
    });

    it('should throw UnauthorizedException for missing authorization header', async () => {
      const mockRequest = {
        headers: {},
      };

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
      expect(mockJwtService.verifyAsync).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid authorization header format', async () => {
      const mockRequest = {
        headers: {
          authorization: 'InvalidFormat jwt.token',
        },
      };

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
      expect(mockJwtService.verifyAsync).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid JWT token', async () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer invalid.jwt.token',
        },
      };

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('invalid.jwt.token');
    });

    it('should throw UnauthorizedException for expired JWT token', async () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer expired.jwt.token',
        },
      };

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      mockJwtService.verifyAsync.mockRejectedValue(new Error('Token expired'));

      await expect(guard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
    });

    it('should handle Bearer token with extra spaces', async () => {
      const mockRequest = {
        headers: {
          authorization: '  Bearer   valid.jwt.token  ',
        },
      };

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      const mockPayload = {
        sub: 'user-123',
        email: 'user@test.com',
        roles: ['SALES'],
      };

      mockJwtService.verifyAsync.mockResolvedValue(mockPayload);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockJwtService.verifyAsync).toHaveBeenCalledWith('valid.jwt.token');
    });

    it('should set user on request object', async () => {
      const mockRequest = {
        headers: {
          authorization: 'Bearer valid.jwt.token',
        },
      };

      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;

      const mockPayload = {
        sub: 'user-456',
        email: 'admin@test.com',
        roles: ['ADMIN', 'SALES'],
        iat: 1234567890,
        exp: 1234567890 + 3600,
      };

      mockJwtService.verifyAsync.mockResolvedValue(mockPayload);

      await guard.canActivate(mockContext);

      expect(mockRequest['user']).toEqual(mockPayload);
    });
  });
});