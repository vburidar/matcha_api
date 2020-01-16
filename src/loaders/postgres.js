import pg from 'pg';
import config from '../config';

export default () => {
  const pgPool = new pg.Pool({
    user: config.postgres.user,
    host: config.postgres.host,
    database: config.postgres.database,
    password: config.postgres.password,
    port: config.postgres.port,
  });

  return pgPool;
};
