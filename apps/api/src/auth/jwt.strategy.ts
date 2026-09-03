import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppConfig } from '../config/app.config';

export interface AuthenticatedUser {
  sub: string;
  username: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: AppConfig) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.accessSecret,
    });
  }

  validate(payload: { sub: string; username: string }): AuthenticatedUser {
    if (!payload?.sub) throw new UnauthorizedException();
    return { sub: payload.sub, username: payload.username };
  }
}

declare global {
  namespace Express {
    interface User {
      sub: string;
      username: string;
    }
  }
}
