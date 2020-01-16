import { Router } from 'express';
import AuthService from '../../services/auth';
import { requestValidator, rv } from '../middlewares';

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
        console.log(err);
        return next(err);
      }
    },
  );
};
