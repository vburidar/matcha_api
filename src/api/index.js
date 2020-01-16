import { Router } from 'express';
import auth from './routes/auth';
import db from './routes/db';

export default () => {
  const app = Router();
  auth(app);
  db(app);

  return app;
};
