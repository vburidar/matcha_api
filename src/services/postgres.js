import pg from 'pg';
import config from '../config';

export default class PostgresService {
  static async load() {
    if (!this.pool) {
      this.pool = new pg.Pool({
        user: config.postgres.user,
        host: config.postgres.host,
        database: config.postgres.database,
        password: config.postgres.password,
        port: config.postgres.port,
      });
    }
  }

  static async createTransaction() {
    this.client = await this.pool.connect();
    this.transactions = {};
    await this.client.query('BEGIN');
  }

  static async query(queryText, params, inTransaction = false, queryName = '') {
    let result;
    if (inTransaction) {
      if (!this.client) throw new Error('internal_server');
      result = await this.client.query(queryText, params);
      if (queryName !== '') {
        this.transactions[queryName] = result;
      }
    } else {
      result = await this.pool.query(queryText, params);
    }
    return result;
  }

  static getQueryResult(queryName) {
    return this.transactions[queryName];
  }

  static async commitTransaction() {
    try {
      await this.client.query('COMMIT');
    } catch (err) {
      await this.client.query('ROLLBACK');
      throw err;
    } finally {
      this.client.release();
      this.transactions = {};
    }
  }
}
