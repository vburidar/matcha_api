import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import session from 'express-session';
import PgStore from 'connect-pg-simple';
import routes from './api';

import config from './config';

import EmailService from './services/email';
import PostgresService from './services/postgres';

async function startServer() {
  const app = express();

  EmailService.load();
  PostgresService.load();

  app.use(cors());
  app.use(bodyParser.json());
  const PgSession = PgStore(session);
  app.use(session({
    secret: config.expressSession.secret,
    cookie: { maxAge: 60000 },
    saveUninitialized: false,
    resave: false,
    store: new PgSession({
      pool: PostgresService.pool,
      tableName: 'sessions',
    }),
  }));

  app.use(config.api.prefix, routes());

  app.listen(config.port, () => {
    console.log(`Server started on port ${config.port}`);
  });
}
startServer();
