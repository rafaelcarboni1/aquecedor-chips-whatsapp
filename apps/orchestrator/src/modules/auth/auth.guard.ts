import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createClient } from '@supabase/supabase-js';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from './public.decorator';
import * as jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    tenant_id: string;
    role: string;
  };
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Token not provided');
    }

    try {
      // Verificar o JWT customizado
      const payload = jwt.verify(token, process.env.JWT_SECRET) as any;
      
      // Criar cliente Supabase para buscar dados do usuário
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      
      // Buscar dados adicionais do usuário na tabela t_users
      const { data: userData, error } = await supabase
        .from('t_users')
        .select('id, email, tenant_id, role')
        .eq('id', payload.sub)
        .single();
      
      if (error || !userData) {
        throw new UnauthorizedException('User not found');
      }
      
      // Adicionar dados do usuário à requisição
      request.user = {
        id: userData.id,
        email: userData.email,
        tenant_id: userData.tenant_id,
        role: userData.role || 'user',
      };
      
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}