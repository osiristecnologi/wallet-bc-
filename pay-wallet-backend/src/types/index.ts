import { Request } from 'express';

export interface JwtPayload {
  id: string;
  role: 'USER' | 'ADMIN';
  entityType: 'user' | 'admin';
}

export interface AuthRequest extends Request {
  user: JwtPayload;
}
