import { Router } from 'express';
import AuthService from '../../services/auth';
import { requestValidator, rv } from '../middlewares/requestValidator';
import { errorHandler, ErrException } from '../middlewares/errorHandler';


const route = Router();

export default (app) => {
  app.use('/auth', route);

  route.post(
    '/signup',
    requestValidator({
      body: {
        login: [rv.required(), rv.string()],
        password: [rv.required(), rv.string(), rv.password()],
        email: [rv.required(), rv.string(), rv.email()],
      },
    }),
    async (req, res, next) => {
      try {
        const user = await AuthService.signup(req.body);
        return res.status(200).send(user);
      } catch (err) {
        return next(err);
      }
    },
  );

  route.post(
    '/signin',
    requestValidator({
      body: {
        login: [rv.required(), rv.string()],
        password: [rv.required(), rv.string(), rv.password()],
      },
    }),
    async (req, res, next) => {
      try {
        const user = await AuthService.signin(req.body);
        if (user && req.session.login === undefined) {
          req.session.login = user.login;
        } else if (user) {
          return next(new ErrException({ id: 'user_already_exists' }));
        }
        return res.status(200).send(user);
      } catch (err) {
        return next(err);
      }
    },
  );

  app.use(errorHandler);
};
