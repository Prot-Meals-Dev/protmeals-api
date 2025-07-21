import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.prisma.users.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user) return null;

    if (!user.password) {
      throw new UnauthorizedException('Invalid login method');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return null;

    const { password: _, ...result } = user;
    return result;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    return this.generateToken(user);
  }

  async register(registerDto: RegisterDto) {
    const { email } = registerDto;

    const existingUser = await this.prisma.users.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const user = await this.usersService.create({
      ...registerDto,
      region_id:
        registerDto.role === 'fleet_manager' || registerDto.role === 'client'
          ? registerDto.region_id
          : undefined,
    });

    if (registerDto.password) {
      return this.generateToken(user);
    } else {
      return await this.generateOtp(email);
    }
  }

  async generateToken(user: any) {
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role.name,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role.name,
      },
    };
  }

  async generateOtp(email: string) {
    const user = await this.prisma.users.findUnique({ where: { email } });

    if (!user) {
      return { message: 'Not a registered user' };
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 15);

    // Upsert using composite unique key (user_id)
    const existingOtp = await this.prisma.user_otps.findFirst({
      where: { user_id: user.id },
    });

    if (existingOtp) {
      await this.prisma.user_otps.update({
        where: { id: existingOtp.id },
        data: {
          otp_secret: otp,
          expires_at: expiry,
        },
      });
    } else {
      await this.prisma.user_otps.create({
        data: {
          user_id: user.id,
          otp_secret: otp,
          expires_at: expiry,
        },
      });
    }

    if (process.env.NODE_ENV !== 'production') {
      return {
        message: 'OTP generated (development mode)',
        otp,
      };
    }

    return { message: 'OTP sent to your email' };
  }

  async validateOtp(email: string, otp: string) {
    const user = await this.prisma.users.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const userOtp = await this.prisma.user_otps.findFirst({
      where: { user_id: user.id },
    });

    if (!userOtp || userOtp.otp_secret !== otp) {
      throw new UnauthorizedException('Invalid OTP');
    }

    if (new Date() > userOtp.expires_at) {
      throw new UnauthorizedException('OTP has expired');
    }

    // Delete OTP entry after successful validation
    await this.prisma.user_otps.delete({
      where: { id: userOtp.id },
    });

    return this.generateToken(user);
  }
}
