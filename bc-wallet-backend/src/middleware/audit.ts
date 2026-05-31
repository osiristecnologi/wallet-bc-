import { Request, Response, NextFunction } from 'express';
import { auditLogRepository } from '../repositories/auditLogRepository';

export const auditMiddleware = (action: string, resourceType?: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const originalSend = res.send;
    
    res.send = function (body) {
      const statusCode = res.statusCode;
      const isSuccess = statusCode >= 200 && statusCode < 300;
      
      if (isSuccess) {
        auditLogRepository.create({
          actor: (req as any).user?.userId,
          actor_type: (req as any).user ? 'user' : 'system',
          action,
          resource_type: resourceType,
          metadata: { 
            path: req.path, 
            method: req.method,
            statusCode,
            params: req.params,
            query: req.query,
          },
          ip_address: req.ip,
          user_agent: req.get('user-agent'),
        }).catch(console.error);
      }
      
      return originalSend.call(this, body);
    };
    
    next();
  };
};
