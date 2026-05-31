import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { db } from '../config/database';

interface AuditQueryParams {
  page?: string;
  limit?: string;
  actorType?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export const auditController = {
  async getAuditLogs(req: AuthRequest, res: Response): Promise<void> {
    try {
      const {
        page = '1',
        limit = '20',
        actorType,
        action,
        startDate,
        endDate,
        search,
      } = req.query as AuditQueryParams;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      // Filtros
      if (actorType) {
        conditions.push(`actor_type = $${paramIndex++}`);
        params.push(actorType);
      }

      if (action) {
        conditions.push(`action = $${paramIndex++}`);
        params.push(action);
      }

      if (startDate) {
        conditions.push(`created_at >= $${paramIndex++}`);
        params.push(new Date(startDate));
      }

      if (endDate) {
        conditions.push(`created_at <= $${paramIndex++}`);
        params.push(new Date(endDate));
      }

      if (search) {
        conditions.push(`(metadata::text ILIKE $${paramIndex++} OR action ILIKE $${paramIndex})`);
        params.push(`%${search}%`, `%${search}%`);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Count total
      const countResult = await db.query(
        `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`,
        params
      );

      const total = parseInt(countResult.rows[0].total);

      // Get logs with user info
      const logsResult = await db.query(
        `SELECT al.*, u.nome as actor_name, u.email as actor_email
         FROM audit_logs al
         LEFT JOIN users u ON al.actor = u.id
         ${whereClause}
         ORDER BY al.created_at DESC
         LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
        [...params, parseInt(limit), offset]
      );

      const totalPage = Math.ceil(total / parseInt(limit));

      res.json({
        success: true,
        data: {
          logs: logsResult.rows,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPage,
          },
        },
      });
    } catch (error: any) {
      console.error('Get audit logs error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch audit logs',
      });
    }
  },

  async getAuditLogById(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const result = await db.query(
        `SELECT al.*, u.nome as actor_name, u.email as actor_email
         FROM audit_logs al
         LEFT JOIN users u ON al.actor = u.id
         WHERE al.id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Audit log not found',
        });
        return;
      }

      res.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error: any) {
      console.error('Get audit log by ID error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch audit log',
      });
    }
  },

  async getAuditSummary(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Resumo das últimas 24 horas
      const last24h = await db.query(`
        SELECT action, COUNT(*) as count
        FROM audit_logs
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY action
        ORDER BY count DESC
      `);

      // Resumo dos últimos 7 dias
      const last7d = await db.query(`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM audit_logs
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `);

      // Tipos de atores
      const actorTypes = await db.query(`
        SELECT actor_type, COUNT(*) as count
        FROM audit_logs
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY actor_type
      `);

      // Ações mais críticas
      const criticalActions = await db.query(`
        SELECT action, COUNT(*) as count
        FROM audit_logs
        WHERE action IN ('BC_ISSUED', 'BC_REDEEMED', 'USER_LOGIN', 'ADMIN_ACTION')
        AND created_at >= NOW() - INTERVAL '7 days'
        GROUP BY action
        ORDER BY count DESC
      `);

      res.json({
        success: true,
        data: {
          last24h: last24h.rows,
          last7d: last7d.rows,
          actorTypes: actorTypes.rows,
          criticalActions: criticalActions.rows,
        },
      });
    } catch (error: any) {
      console.error('Get audit summary error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch audit summary',
      });
    }
  },

  async exportAuditLogs(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { startDate, endDate, actorType, action } = req.query as AuditQueryParams;

      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (actorType) {
        conditions.push(`actor_type = $${paramIndex++}`);
        params.push(actorType);
      }

      if (action) {
        conditions.push(`action = $${paramIndex++}`);
        params.push(action);
      }

      if (startDate) {
        conditions.push(`created_at >= $${paramIndex++}`);
        params.push(new Date(startDate));
      }

      if (endDate) {
        conditions.push(`created_at <= $${paramIndex++}`);
        params.push(new Date(endDate));
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const result = await db.query(
        `SELECT al.id, al.action, al.actor_type, u.nome as actor_name, u.email as actor_email,
                al.metadata, al.ip_address, al.created_at
         FROM audit_logs al
         LEFT JOIN users u ON al.actor = u.id
         ${whereClause}
         ORDER BY al.created_at DESC
         LIMIT 10000`,
        params
      );

      // Converter para CSV
      const headers = ['ID', 'Ação', 'Tipo de Ator', 'Nome', 'Email', 'Metadata', 'IP', 'Data/Hora'];
      const csvRows = [headers.join(',')];

      result.rows.forEach(row => {
        const csvRow = [
          row.id,
          row.action,
          row.actor_type,
          `"${row.actor_name || ''}"`,
          `"${row.actor_email || ''}"`,
          `"${JSON.stringify(row.metadata).replace(/"/g, '""')}"`,
          row.ip_address || '',
          new Date(row.created_at).toISOString(),
        ];
        csvRows.push(csvRow.join(','));
      });

      const csvContent = csvRows.join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=audit_logs.csv');
      res.send(csvContent);
    } catch (error: any) {
      console.error('Export audit logs error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to export audit logs',
      });
    }
  },

  async getAuditStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      // Total de logs
      const totalResult = await db.query('SELECT COUNT(*) as total FROM audit_logs');
      
      // Logs por hora (últimas 24h)
      const hourlyResult = await db.query(`
        SELECT 
          DATE_TRUNC('hour', created_at) as hour,
          COUNT(*) as count
        FROM audit_logs
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY hour
        ORDER BY hour DESC
      `);

      // Top 10 atores mais ativos
      const topActorsResult = await db.query(`
        SELECT 
          al.actor,
          u.nome,
          u.email,
          COUNT(*) as action_count
        FROM audit_logs al
        LEFT JOIN users u ON al.actor = u.id
        WHERE al.actor IS NOT NULL
        GROUP BY al.actor, u.nome, u.email
        ORDER BY action_count DESC
        LIMIT 10
      `);

      // Ações mais frequentes
      const topActionsResult = await db.query(`
        SELECT action, COUNT(*) as count
        FROM audit_logs
        GROUP BY action
        ORDER BY count DESC
        LIMIT 10
      `);

      res.json({
        success: true,
        data: {
          total: parseInt(totalResult.rows[0].total),
          last24h: hourlyResult.rows,
          topActors: topActorsResult.rows,
          topActions: topActionsResult.rows,
        },
      });
    } catch (error: any) {
      console.error('Get audit stats error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch audit stats',
      });
    }
  },
};
