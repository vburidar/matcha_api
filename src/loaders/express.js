import bodyParser from 'body-parser';
import cors from 'cors';
import session from 'express-session';
import PgStore from 'connect-pg-simple';

import config from '../config';
import routes from '../api';

export default ({ app, pgPool }) => {
  app.use(cors());

  app.use(bodyParser.json());

  const PgSession = PgStore(session);
  app.use(session({
    secret: config.expressSession.secret,
    cookie: { maxAge: 60000 },
    saveUninitialized: false,
    resave: false,
    store: new PgSession({
      pool: pgPool,
      tableName: 'sessions',
    }),
  }));

  app.use(config.api.prefix, routes());

  app.get('/', async (req, res) => {
    res.send('Root of API');
  });
};
