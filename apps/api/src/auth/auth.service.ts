import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AppConfig } from '../config/app.config';
import { cryptoUtils } from '../common/crypto';
import { RegisterDto, LoginDto, ChangePasswordDto, UpdateProfileDto } from './auth.dto';
import type { AuthPayload, PublicUser } from '@messenger/shared';

const usernamePattern = /^[a-zA-Z0-9_.-]+$/;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: AppConfig,
  ) {}

  async register(dto: RegisterDto): Promise<AuthPayload> {
    const username = dto.username.trim().toLowerCase();
    if (!usernamePattern.test(username)) {
      throw new BadRequestException('Username may only contain letters, digits, dot, dash and underscore');
    }

    const existing = await this.prisma.user.findUnique({ where: { username } });
    if (existing) {
      throw new ConflictException('Username is already taken');
    }

    const passwordHash = await cryptoUtils.hashPassword(dto.password);
    const user = await this.prisma.user.create({
      data: {
        username,
        displayName: dto.displayName.trim(),
        passwordHash,
      },
    });

    return this.buildAuthPayload(user);
  }

  async login(dto: LoginDto): Promise<AuthPayload> {
    const username = dto.username.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await cryptoUtils.verifyPassword(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.buildAuthPayload(user);
  }

  async refresh(refreshToken: string): Promise<AuthPayload> {
    let payload: { sub: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const hash = cryptoUtils.sha256(refreshToken);
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.refreshTokenHash || user.refreshTokenHash !== hash) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.buildAuthPayload(user);
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      const hash = cryptoUtils.sha256(refreshToken);
      await this.prisma.user.updateMany({
        where: { id: userId, refreshTokenHash: hash },
        data: { refreshTokenHash: null },
      });
    }
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    const valid = await cryptoUtils.verifyPassword(dto.currentPassword, user.passwordHash);
    if (!valid) throw new BadRequestException('Current password is incorrect');

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await cryptoUtils.hashPassword(dto.newPassword), refreshTokenHash: null },
    });
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return toPublicUser(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<PublicUser> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.displayName !== undefined ? { displayName: dto.displayName.trim() } : {}),
        ...(dto.avatarUrl !== undefined ? { avatarUrl: dto.avatarUrl } : {}),
      },
    });
    return toPublicUser(user);
  }

  private async buildAuthPayload(user: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    createdAt: Date;
  }): Promise<AuthPayload> {
    const accessToken = await this.jwt.signAsync({ sub: user.id, username: user.username });
    const refreshToken = await this.jwt.signAsync(
      { sub: user.id },
      { secret: this.config.refreshSecret, expiresIn: this.config.refreshTtl },
    );

    const hash = cryptoUtils.sha256(refreshToken);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: hash },
    });

    return {
      user: toPublicUser(user),
      tokens: { accessToken, refreshToken },
    };
  }
}

export function toPublicUser(user: {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: Date;
}): PublicUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt.toISOString(),
  };
}
