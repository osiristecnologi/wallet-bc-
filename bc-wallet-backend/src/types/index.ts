export interface User {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  is_active: boolean;
  created_at: Date;
  last_login_at?: Date;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: string;
  created_at: Date;
  updated_at: Date;
}

export interface Transaction {
  id: string;
  tx_hash: string;
  type: 'ISSUE' | 'REDEEM' | 'TRANSFER_COMPANY_TO_USER' | 'TRANSFER_USER_TO_COMPANY';
  from_wallet?: string;
  to_wallet?: string;
  amount: string;
  status: 'pending' | 'completed' | 'failed';
  metadata?: Record<string, any>;
  created_at: Date;
  created_by?: string;
}

export interface AuditLog {
  id: string;
  actor?: string;
  actor_type: 'user' | 'admin' | 'system';
  action: string;
  resource_type?: string;
  resource_id?: string;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

export interface Treasury {
  id: number;
  balance: string;
  total_issued: string;
  total_redeemed: string;
  created_at: Date;
  updated_at: Date;
}

export interface JwtPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
  jti: string;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}
