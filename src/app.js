import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import session from 'express-session';
import PgStore from 'connect-pg-simple';

import routes from './api';

import config from './config';

import EmailService from './services/email';
import PostgresService from './services/postgres';
import SocketService from './services/socket';

async function startServer() {
  const app = express();

  EmailService.load();
  PostgresService.load();

  const corsOptions = {
    origin: 'http://seeyou.victorburidard.com',
    credentials: true,
  };
  app.use(cors(corsOptions));

  app.use(bodyParser.json({ limit: '10mb' }));

  const PgSession = PgStore(session);
  app.use(session({
    secret: config.expressSession.secret,
    cookie: {
      resave: true,
      maxAge: 60000000,
      httpOnly: true,
    },
    saveUninitialized: false,
    resave: false,
    store: new PgSession({
      pool: PostgresService.pool,
      tableName: 'sessions',
    }),
  }));

  app.use('/pictures', express.static('public/pictures'));

  app.use(config.api.prefix, routes());

  const server = app.listen(config.port, () => {
    console.log(`Server started on port ${config.port}`);
  });

  SocketService.load(server);
}
startServer();
