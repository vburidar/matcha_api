import { Router } from 'express';
import auth from './routes/auth';
import profile from './routes/profile';
import db from './routes/db';

export default () => {
  const app = Router();
  auth(app);
  profile(app);
  db(app);

  return app;
};
