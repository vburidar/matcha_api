import { Router } from 'express';
import { requestValidator, rv } from '../middlewares/requestValidator';
import { errorHandler, ErrException } from '../middlewares/errorHandler';
import UserService from '../../services/users';

const route = Router();

export default (app) => {
  app.use('/users', route);

  route.get(
    '/getSuggestionList',
    async (req, res, next) => {
      try {
        const list = await UserService.getSuggestionList(req.session.user_id);
        console.log(list.rows);
        return res.status(200).send(list);
      } catch (err) {
        return next(err);
      }
    },
  );
};
