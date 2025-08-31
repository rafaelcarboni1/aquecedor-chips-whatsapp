import { Injectable, UnauthorizedException, ConflictException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private databaseService: DatabaseService,
  ) {}

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Usar Supabase Auth para autenticação
    const supabase = this.databaseService.getClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      this.logger.error('Login failed:', error.message);
      throw new UnauthorizedException('Invalid credentials');
    }

    const { user, session } = data;

    // Gerar tokens customizados para a aplicação
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.user_metadata?.role || 'user',
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name,
        role: user.user_metadata?.role || 'user',
      },
      tokens: {
        accessToken,
        refreshToken,
        supabaseToken: session.access_token,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    const { email, password, name } = registerDto;

    // Usar service role para criar usuário sem confirmação de email
    const supabase = this.databaseService.getClient();
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        name: name || email.split('@')[0],
        role: 'user',
      },
      email_confirm: true, // Confirmar email automaticamente
    });

    if (error) {
      this.logger.error('Registration failed:', error.message);
      if (error.message.includes('already registered')) {
        throw new ConflictException('User already exists');
      }
      throw new UnauthorizedException(error.message);
    }

    const { user } = data;

    return {
      message: 'Registration successful. Please check your email for verification.',
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name,
      },
    };
  }

  async getProfile(userId: string) {
    const supabase = this.databaseService.getClient();
    const { data: user, error } = await supabase.auth.admin.getUserById(userId);

    if (error || !user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.user.id,
      email: user.user.email,
      name: user.user.user_metadata?.name,
      role: user.user.user_metadata?.role || 'user',
      createdAt: user.user.created_at,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      
      const newPayload = {
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
      };

      const newAccessToken = this.jwtService.sign(newPayload);
      const newRefreshToken = this.jwtService.sign(newPayload, {
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string) {
    // Invalidar sessão no Supabase se necessário
    const supabase = this.databaseService.getClient();
    await supabase.auth.admin.signOut(userId);

    return {
      message: 'Logout successful',
    };
  }

  async validateUser(payload: any) {
    const { sub: userId } = payload;
    
    try {
      const profile = await this.getProfile(userId);
      return profile;
    } catch (error) {
      return null;
    }
  }
}