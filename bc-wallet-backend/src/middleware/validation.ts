import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult, ValidationChain } from 'express-validator';

/**
 * Middleware centralizado para tratamento de erros de validação
 * Retorna formato padrão consistente com o resto da API
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.path,
      message: err.msg,
      code: err.type,
    }));

    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: formattedErrors,
    });
    return;
  }

  next();
};

/**
 * Converte array de ValidationChain para middleware Express
 */
export const validate = (chains: ValidationChain[]) => {
  return [...chains, handleValidationErrors];
};

// ==========================================
// VALIDAÇÕES DE AUTENTICAÇÃO
// ==========================================

export const registerValidation = validate([
  body('nome')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Nome deve ter entre 2 e 100 caracteres'),
    
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Formato de email inválido'),
    
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Senha deve ter entre 8 e 128 caracteres')
    .matches(/[A-Z]/)
    .withMessage('Senha deve conter pelo menos uma letra maiúscula')
    .matches(/[0-9]/)
    .withMessage('Senha deve conter pelo menos um número')
    .matches(/[^A-Za-z0-9]/)
    .withMessage('Senha deve conter pelo menos um caractere especial'),
    
  body('pin')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('PIN deve conter exatamente 6 dígitos numéricos'),
    
  body('telefone')
    .optional()
    .trim()
    .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)
    .withMessage('Formato de telefone inválido')
]);

export const loginValidation = validate([
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Formato de email inválido'),
    
  body('password')
    .notEmpty()
    .withMessage('Senha é obrigatória')
]);

export const refreshTokenValidation = validate([
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token é obrigatório')
]);

// ==========================================
// VALIDAÇÕES DE TRANSAÇÕES
// ==========================================

export const issueBCValidation = validate([
  body('toUserId')
    .isUUID(4)
    .withMessage('ID do usuário destinatário inválido'),
    
  body('amount')
    .isFloat({ min: 0.00000001 })
    .withMessage('Valor deve ser maior que zero'),
    
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Motivo não pode exceder 500 caracteres')
]);

export const redeemBCValidation = validate([
  body('amount')
    .isFloat({ min: 0.00000001 })
    .withMessage('Valor deve ser maior que zero'),
    
  body('reason')
    .trim()
    .isLength({ min: 5, max: 500 })
    .withMessage('Motivo deve ter entre 5 e 500 caracteres')
]);

// ==========================================
// VALIDAÇÕES ADMINISTRATIVAS
// ==========================================

export const toggleUserStatusValidation = validate([
  param('userId')
    .isUUID(4)
    .withMessage('ID do usuário inválido'),
    
  body('isActive')
    .isBoolean()
    .withMessage('Status deve ser verdadeiro ou falso')
]);

export const adminIssueBCValidation = validate([
  body('toUserId')
    .isUUID(4)
    .withMessage('ID do usuário destinatário inválido'),
    
  body('amount')
    .isFloat({ min: 0.00000001 })
    .withMessage('Valor deve ser maior que zero'),
    
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Motivo não pode exceder 500 caracteres')
]);

// ==========================================
// VALIDAÇÕES DE QUERY/PAGINAÇÃO
// ==========================================

export const paginationValidation = validate([
  query('page')
    .optional()
    .isInt({ min: 1 })
    .toInt()
    .withMessage('Página deve ser um número inteiro positivo'),
    
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .toInt()
    .withMessage('Limite deve estar entre 1 e 100'),
    
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Termo de busca não pode exceder 100 caracteres'),
    
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Data inicial em formato inválido (use ISO 8601)'),
    
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Data final em formato inválido (use ISO 8601)')
]);

export const auditFilterValidation = validate([
  query('actorType')
    .optional()
    .isIn(['user', 'admin', 'system'])
    .withMessage('Tipo de ator inválido'),
    
  query('action')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Ação não pode exceder 100 caracteres')
]);
