import { Router } from 'express';
import auth from './routes/auth';
import profile from './routes/profile';
import users from './routes/users';
import event from './routes/event';

export default () => {
  const app = Router();
  auth(app);
  profile(app);
  users(app);
  event(app);

  return app;
};
