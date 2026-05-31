import { Router } from 'express';
import { walletController } from '../controllers/walletController';
import { authenticate, requireAdmin } from '../middleware/auth';
import { createRateLimiter } from '../middleware/rateLimiter';

const router = Router();
const rateLimiter = createRateLimiter();

// ==========================================
// MIDDLEWARE DE SEGURANÇA
// ==========================================

// Todas as rotas de carteira exigem autenticação (Token JWT válido)
router.use(authenticate);

// ==========================================
// ROTAS PÚBLICAS DO USUÁRIO (Acessível pelo App)
// ==========================================

// GET /api/v1/wallet - Retorna dados completos da carteira (Saldo + Info Usuário)
router.get('/', rateLimiter, walletController.getWallet);

// GET /api/v1/wallet/balance - Retorna apenas o saldo (Otimizado para chamadas frequentes)
router.get('/balance', rateLimiter, walletController.getBalance);

// GET /api/v1/wallet/transactions - Histórico paginado de transações do usuário
router.get('/transactions', rateLimiter, walletController.getTransactionHistory);

// GET /api/v1/wallet/recent - Últimas 10 transações (Para o Dashboard)
router.get('/recent', rateLimiter, walletController.getRecentTransactions);

// GET /api/v1/wallet/validate - Verifica integridade do saldo (Consistência DB vs Cache)
router.get('/validate', rateLimiter, walletController.validateBalance);

// ==========================================
// ROTAS ADMINISTRATIVAS (Painel Admin)
// ==========================================

// Middleware extra: Apenas ADMINS podem acessar rotas abaixo
// O requireAdmin verifica se o user.role === 'admin' no banco
router.use(requireAdmin);

// GET /api/v1/wallet/admin/stats - Estatísticas gerais (Total em circulação, Top holders, etc)
router.get('/admin/stats', rateLimiter, walletController.getWalletStats);

// GET /api/v1/wallet/admin/all - Lista todas as carteiras do sistema (Paginado)
router.get('/admin/all', rateLimiter, walletController.getAllWallets);

// GET /api/v1/wallet/admin/users/:userId - Ver detalhes da carteira de um usuário específico
router.get('/admin/users/:userId', rateLimiter, walletController.getWalletByUserId);

export default router;
