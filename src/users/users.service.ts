import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../common/decorators/roles.decorator';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role?: Role;
}

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Find user by email ─────────────────────────────────────
  // Returns full user including password hash
  // Used internally by AuthService for login validation
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
  }

  // ── Find user by ID ────────────────────────────────────────
  // Returns user without password
  // Used by JWT strategy to validate token subjects
  async findById(id: string): Promise<SafeUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  // ── Create new user ────────────────────────────────────────
  async createUser(data: CreateUserData): Promise<SafeUser> {
    // Check if email already registered
    const existingUser = await this.findByEmail(data.email);

    if (existingUser) {
      throw new ConflictException(
        'An account with this email address already exists',
      );
    }

    // Hash password before storing
    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

    // Create user record
    const user = await this.prisma.user.create({
      data: {
        name: data.name.trim(),
        email: data.email.toLowerCase().trim(),
        password: hashedPassword,
        role: data.role ?? 'REVIEWER',
      },
      // Never return password in response
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  // ── Get all users ──────────────────────────────────────────
  // Admin only - used for user management
  async findAll(): Promise<SafeUser[]> {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
