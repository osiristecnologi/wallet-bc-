import { db } from '../config/database';
import { AuditLog } from '../types';

export const auditLogRepository = {
  async create(data: {
    actor?: string;
    actor_type: string;
    action: string;
    resource_type?: string;
    resource_id?: string;
    metadata?: any;
    ip_address?: string;
    user_agent?: string;
  }): Promise<AuditLog> {
    const result = await db.query(
      `INSERT INTO audit_logs (actor, actor_type, action, resource_type, resource_id, metadata, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [data.actor || null, data.actor_type, data.action, data.resource_type || null, 
       data.resource_id || null, JSON.stringify(data.metadata), data.ip_address || null, data.user_agent || null]
    );
    return result.rows[0];
  },

  async findAll(filters?: any, limit: number = 20, offset: number = 0): Promise<{ logs: any[]; total: number }> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.actorType) {
      conditions.push(`actor_type = $${paramIndex++}`);
      params.push(filters.actorType);
    }
    if (filters?.action) {
      conditions.push(`action = $${paramIndex++}`);
      params.push(filters.action);
    }
    if (filters?.startDate) {
      conditions.push(`created_at >= $${paramIndex++}`);
      params.push(new Date(filters.startDate));
    }
    if (filters?.endDate) {
      conditions.push(`created_at <= $${paramIndex++}`);
      params.push(new Date(filters.endDate));
    }
    if (filters?.search) {
      conditions.push(`(metadata::text ILIKE $${paramIndex++} OR action ILIKE $${paramIndex})`);
      params.push(`%${filters.search}%`, `%${filters.search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const logsResult = await db.query(
      `SELECT al.*, u.nome as actor_name, u.email as actor_email
       FROM audit_logs al
       LEFT JOIN users u ON al.actor = u.id
       ${whereClause}
       ORDER BY al.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
      [...params, limit, offset]
    );

    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`,
      params
    );

    return {
      logs: logsResult.rows,
      total: parseInt(countResult.rows[0].total),
    };
  },

  async findById(id: string): Promise<any | null> {
    const result = await db.query(
      `SELECT al.*, u.nome as actor_name, u.email as actor_email
       FROM audit_logs al
       LEFT JOIN users u ON al.actor = u.id
       WHERE al.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  async getSummary(): Promise<any> {
    const last24h = await db.query(
      `SELECT action, COUNT(*) as count FROM audit_logs WHERE created_at >= NOW() - INTERVAL '24 hours' GROUP BY action ORDER BY count DESC`
    );
    const last7d = await db.query(
      `SELECT DATE(created_at) as date, COUNT(*) as count FROM audit_logs WHERE created_at >= NOW() - INTERVAL '7 days' GROUP BY DATE(created_at) ORDER BY date DESC`
    );
    const actorTypes = await db.query(
      `SELECT actor_type, COUNT(*) as count FROM audit_logs WHERE created_at >= NOW() - INTERVAL '30 days' GROUP BY actor_type`
    );
    const criticalActions = await db.query(
      `SELECT action, COUNT(*) as count FROM audit_logs WHERE action IN ('BC_ISSUED', 'BC_REDEEMED', 'USER_LOGIN', 'ADMIN_ACTION') AND created_at >= NOW() - INTERVAL '7 days' GROUP BY action ORDER BY count DESC`
    );

    return { last24h: last24h.rows, last7d: last7d.rows, actorTypes: actorTypes.rows, criticalActions: criticalActions.rows };
  },

  async getStats(): Promise<any> {
    const total = await db.query('SELECT COUNT(*) as total FROM audit_logs');
    const hourly = await db.query(
      `SELECT DATE_TRUNC('hour', created_at) as hour, COUNT(*) as count FROM audit_logs WHERE created_at >= NOW() - INTERVAL '24 hours' GROUP BY hour ORDER BY hour DESC`
    );
    const topActors = await db.query(
      `SELECT al.actor, u.nome, u.email, COUNT(*) as action_count FROM audit_logs al LEFT JOIN users u ON al.actor = u.id WHERE al.actor IS NOT NULL GROUP BY al.actor, u.nome, u.email ORDER BY action_count DESC LIMIT 10`
    );
    const topActions = await db.query(
      `SELECT action, COUNT(*) as count FROM audit_logs GROUP BY action ORDER BY count DESC LIMIT 10`
    );

    return {
      total: parseInt(total.rows[0].total),
      last24h: hourly.rows,
      topActors: topActors.rows,
      topActions: topActions.rows,
    };
  },
};
