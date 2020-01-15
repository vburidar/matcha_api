import session from 'express-session';
import pg from 'pg';
import PgStore from 'connect-pg-simple';

function sessionManager() {
  const PgSession = PgStore(session);
  const pgPool = new pg.Pool({
    user: 'vburidar',
    host: 'localhost',
    database: 'matcha',
    password: '',
    port: 5432,
  });

  return session({
    secret: 'P:TXN$jA.5:&qU!7wY]bLLo&`vze]?',
    resave: false,
    cookie: { maxAge: 60000 },
    store: new PgSession({
      pool: pgPool,
      tableName: 'sessions',
    }),
    saveUninitialized: false,
  });
}

export default sessionManager;
