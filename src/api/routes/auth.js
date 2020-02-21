import { Router } from 'express';
import AuthService from '../../services/auth';
import UserService from '../../services/users';
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
        console.log(req.body);
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
        return next(err);
      }
    });

  route.post('/testLinkResetPwd',
    async (req, res, next) => {
      try {
        const testLink = await AuthService.testLink(req.body);
        return res.status(200).send('valid_link');
      } catch (err) {
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

  route.post('/ping',
    async (req, res, next) => {
      if (req.session.user_id) {
        const profileIsComplete = await UserService.isComplete(req.session.user_id);
        console.log('profileIsComplete = ', profileIsComplete);
        return (res.status(200).send({ message: 'in_session', user_id: req.session.user_id, isComplete: profileIsComplete }));
      }
      return (res.status(200).send({ message: 'not_in_session' }));
    });

  route.delete('/deleteSession',
    async (req, res, next) => {
      if (req.session.user_id) {
        req.session.destroy();
        res.status(200).send('session successfully deleted');
      } else {
        res.status(400).send('session_does_not_exist');
      }
    });

  app.use(errorHandler);
};
