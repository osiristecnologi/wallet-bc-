import { AuthRequest } from '../types';
import { AppError } from '../utils/appError';

export const authorize = (...allowedRoles: ('USER' | 'ADMIN')[]) => {
  return (req: AuthRequest, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError('Acesso negado. Permissões insuficientes.', 403);
    }
    next();
  };
};
