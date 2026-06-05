import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  // ── Register ───────────────────────────────────────────────
  async register(dto: RegisterDto) {
    this.logger.log(`Registration attempt for email: ${dto.email}`);

    const user = await this.usersService.createUser({
      name: dto.name,
      email: dto.email,
      password: dto.password,
      role: dto.role,
    });

    this.logger.log(`User registered successfully: ${user.id}`);

    return user;
  }

  // ── Login ──────────────────────────────────────────────────
  async login(dto: LoginDto): Promise<AuthResponse> {
    this.logger.log(`Login attempt for email: ${dto.email}`);

    // Find user by email
    const user = await this.usersService.findByEmail(dto.email);

    // User not found
    // We give the same error as wrong password to prevent
    // user enumeration attacks
    if (!user) {
      this.logger.warn(`Login failed - user not found: ${dto.email}`);
      throw new UnauthorizedException('Invalid email or password');
    }

    // Compare provided password with stored hash
    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      this.logger.warn(`Login failed - invalid password for: ${dto.email}`);
      throw new UnauthorizedException('Invalid email or password');
    }

    // Build JWT payload
    // Keep payload small - only what guards need
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    // Sign the token
    const accessToken = this.jwtService.sign(payload);

    this.logger.log(`Login successful for user: ${user.id}`);

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  // ── Get current user profile ───────────────────────────────
  async getProfile(userId: string) {
    return this.usersService.findById(userId);
  }
}
