import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { JwtPayload } from '../../../common/interfaces/jwt-payload.interface';
import { UserDocument } from '../../users/schemas/user.schema';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('app.jwtSecret'),
    });
  }

  /**
   * Resolves the token's `id` claim to a live user document, so role checks always
   * read the current role rather than whatever was true when the token was issued.
   */
  async validate(payload: JwtPayload): Promise<UserDocument> {
    const user = await this.usersService.findById(payload.id);

    if (!user) {
      throw new UnauthorizedException('User not found!');
    }

    return user;
  }
}
