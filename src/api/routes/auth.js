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
        firstName: [rv.required(), rv.string()],
        lastName: [rv.required(), rv.string()],
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
          req.session.user_id = user.id;
        } else if (user) {
          return next(new ErrException({ id: 'user_logged_already' }));
        }
        return res.status(200).send(user);
      } catch (err) {
        return next(err);
      }
    },
  );

  route.post('/account-validation',
    requestValidator({
      body: {
        login: [rv.required(), rv.string()],
        code: [rv.required(), rv.string()],
      },
    }),
    async (req, res, next) => {
      try {
        const validation = await AuthService.validateAccount(req.body);
        return res.status(200).send(validation);
      } catch (err) {
        return next(err);
      }
    });

  route.post('/forgot-password',
    requestValidator({
      body: {
        email: [rv.required(), rv.string(), rv.email()],
      },
    }),
    async (req, res, next) => {
      try {
        const reset = await AuthService.sendResetPwdLink(req.body);
        return res.status(200).send(reset);
      } catch (err) {
        return next(err);
      }
    });

  route.post('/test-link-reset-password',
    async (req, res, next) => {
      try {
        await AuthService.testLink(req.body);
        return res.status(200).send('valid_link');
      } catch (err) {
        return next(err);
      }
    });

  route.post('/reset-password',
    requestValidator({
      body: {
        login: [rv.required(), rv.string()],
        password: [rv.required(), rv.string(), rv.password()],
        code: [rv.required(), rv.string()],
      },
    }),
    async (req, res, next) => {
      try {
        const reset = await AuthService.resetPwd(req.body);
        return res.status(200).send(reset);
      } catch (err) {
        return next(err);
      }
    });

  route.delete('/delete-session',
    async (req, res) => {
      if (req.session.user_id) {
        req.session.destroy();
        res.status(200).send('session successfully deleted');
      } else {
        res.status(400).send('session_does_not_exist');
      }
    });

  app.use(errorHandler);
};
