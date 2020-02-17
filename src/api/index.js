import { Router } from 'express';
import auth from './routes/auth';
import profile from './routes/profile';
import db from './routes/db';
import users from './routes/users';
import event from './routes/event';

export default () => {
  const app = Router();
  auth(app);
  profile(app);
  db(app);
  users(app);
  event(app);

  return app;
};
