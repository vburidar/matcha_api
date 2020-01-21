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
          return next(new ErrException({ id: 'user_logged_already' }));
        }
        return res.status(200).send(user);
      } catch (err) {
        return next(err);
      }
    },
  );

  route.post('/accountValidation',
    async (req, res, next) => {
      try {
        const validation = await AuthService.validateAccount(req.body);
        return res.status(200).send(validation);
      } catch (err) {
        return next(err);
      }
    });

  route.post('/forgotPwd',
    async (req, res, next) => {
      try {
        const reset = await AuthService.sendResetPwdLink(req.body);
        return res.status(200).send(reset);
      } catch (err) {
        console.log(err);
        return next(err);
      }
    });

  route.post('/resetPwd',
    async (req, res, next) => {
      try {
        const reset = await AuthService.resetPwd(req.body);
        return res.status(200).send(reset);
      } catch (err) {
        return next(err);
      }
    });

  app.use(errorHandler);
};
