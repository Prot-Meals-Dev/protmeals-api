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
import { RegisterDto, CustomerRegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
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
    if (user.status !== 'active') {
      throw new ConflictException('Not an active user');
    }
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
      name: registerDto.name,
      email: registerDto.email,
      password: registerDto.password,
      phone: registerDto.phone,
      role: registerDto.role,
      address: registerDto.address,
      region_id: registerDto.region_id,
    });

    if (registerDto.password) {
      return this.generateToken(user);
    } else {
      return await this.generateOtp(email);
    }
  }

  async customerRegister(customerRegisterDto: CustomerRegisterDto) {
    const { email } = customerRegisterDto;

    const existingUser = await this.prisma.users.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    // Create customer user without password
    const user = await this.usersService.create({
      name: customerRegisterDto.name,
      email: customerRegisterDto.email,
      phone: customerRegisterDto.phone,
      role: 'customer',
      address: customerRegisterDto.address,
      region_id: customerRegisterDto.region_id,
    });

    // Always generate OTP for customer registration
    return await this.generateOtp(email);
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
        address: user.address,
        phone: user.phone,
        role: user.role.name,
        region_id: user.region,
      },
    };
  }

  // Test OTP bypass helpers
  private isTestOtpBypassEnabled(): boolean {
    // Enabled by default in non-production. In production, requires OTP_TEST_ENABLE=true
    const enabledFlag = process.env.OTP_TEST_ENABLE === 'true';
    return process.env.NODE_ENV !== 'production' || enabledFlag;
  }

  private getTestOtp(): string {
    // Default test OTP if not provided via env
    return process.env.OTP_TEST_CODE || process.env.TEST_OTP_CODE || '123456';
  }

  private isTestEmailAllowedForBypass(email: string): boolean {
    // If emails not configured, allow all in non-production
    const emailsEnv = process.env.OTP_TEST_EMAILS || '';
    const domainsEnv = process.env.OTP_TEST_DOMAINS || '';

    if (!emailsEnv && !domainsEnv) {
      return process.env.NODE_ENV !== 'production';
    }

    const emails = emailsEnv
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const domains = domainsEnv
      .split(',')
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean);

    const lower = email.toLowerCase();
    if (emails.includes('*') || emails.includes(lower)) return true;

    const at = lower.lastIndexOf('@');
    if (at !== -1) {
      const domain = lower.substring(at + 1);
      if (domains.includes(domain)) return true;
    }

    return false;
  }

  async generateOtp(email: string) {
    const user = await this.prisma.users.findUnique({ where: { email } });

    if (!user) {
      throw new ConflictException('Not a registered user');
    }

    if (user.status !== 'active') {
      throw new ConflictException('Not an active user');
    }

    // Support test OTP bypass
    const useBypass =
      this.isTestOtpBypassEnabled() && this.isTestEmailAllowedForBypass(email);
    const generatedOtp = useBypass
      ? this.getTestOtp()
      : Math.floor(100000 + Math.random() * 900000).toString();

    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + 15);

    // Upsert OTP
    const existingOtp = await this.prisma.user_otps.findFirst({
      where: { user_id: user.id },
    });
    if (existingOtp) {
      await this.prisma.user_otps.update({
        where: { id: existingOtp.id },
        data: { otp_secret: generatedOtp, expires_at: expiry },
      });
    } else {
      await this.prisma.user_otps.create({
        data: {
          user_id: user.id,
          otp_secret: generatedOtp,
          expires_at: expiry,
        },
      });
    }

    // 🔥 Send OTP email (only if not test mode)
    if (!useBypass && process.env.NODE_ENV === 'production') {
      await this.mailService.sendOtpEmail(user.email, user.name, generatedOtp);
      return { message: 'OTP sent to your email' };
    }

    // In test mode or bypass, return OTP for testing
    return { message: 'OTP generated (test mode)', otp: generatedOtp };
  }

  async validateOtp(email: string, otp: string) {
    const user = await this.prisma.users.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const useBypass =
      this.isTestOtpBypassEnabled() && this.isTestEmailAllowedForBypass(email);
    const testOtp = this.getTestOtp();

    let valid = false;

    // If bypass is enabled and test OTP matches, consider it valid
    if (useBypass && otp === testOtp) {
      valid = true;
    } else {
      // Otherwise, validate against stored OTP
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
      await this.prisma.user_otps.delete({ where: { id: userOtp.id } });
      valid = true;
    }

    if (!valid) {
      throw new UnauthorizedException('Invalid OTP');
    }

    return this.generateToken(user);
  }
}
