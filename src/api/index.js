import { Router } from 'express';
import auth from './routes/auth';
import db from './routes/db';
import users from './routes/users';
import event from './routes/event';

export default () => {
  const app = Router();
  auth(app);
  db(app);
  users(app);
  event(app);

  return app;
};
