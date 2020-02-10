import { Router } from 'express';
import auth from './routes/auth';
import db from './routes/db';
import users from './routes/users';

export default () => {
  const app = Router();
  auth(app);
  db(app);
  users(app);

  return app;
};
