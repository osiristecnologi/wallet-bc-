import { z } from 'zod';

export const userSchema = z.object({
  nome: z.string().min(2).max(100),
  email: z.string().email(),
  telefone: z.string().optional(),
  password: z.string().min(8).max(128),
  pin: z.string().length(6).regex(/^\d{6}$/),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const issueBCSchema = z.object({
  toUserId: z.string().uuid(),
  amount: z.coerce.number().positive(),
  reason: z.string().max(500).optional(),
});

export const redeemBCSchema = z.object({
  amount: z.coerce.number().positive(),
  reason: z.string().min(5).max(500),
});

export type UserInput = z.infer<typeof userSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type IssueBCInput = z.infer<typeof issueBCSchema>;
export type RedeemBCInput = z.infer<typeof redeemBCSchema>;
