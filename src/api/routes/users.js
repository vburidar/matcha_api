import { Router } from 'express';
import { requestValidator, rv } from '../middlewares/requestValidator';
import { errorHandler, ErrException } from '../middlewares/errorHandler';
import UserService from '../../services/users';
import ProfileService from '../../services/profile';

const route = Router();

export default (app) => {
  app.use('/users', route);

  route.get(
    '/getSuggestionList',
    async (req, res, next) => {
      try {
        const list = await UserService.getSuggestionList(req.session.user_id);
        return res.status(200).send(list);
      } catch (err) {
        return next(err);
      }
    },
  );

  route.get(
    '/getProfileInfo/:user_id',
    async (req, res, next) => {
      try {
        let profile;
        if (req.params.user_id === 'current') {
          profile = await ProfileService.getCompletePrivateProfile(req.session.user_id);
        } else {
          profile = await UserService.getProfileInfo(req.params.user_id, req.session.user_id);
        }
        return res.status(200).send(profile);
      } catch (err) {
        return next(err);
      }
    },
  );

  route.get(
    '/:id/matches',
    async (req, res, next) => {
      try {
        let profile;
        if (req.params.id === 'current') {
          profile = await UserService.getMatchesWithLastMessage(req.session.user_id);
        } else {
          throw new ErrException({ id: 'not-authorized' });
        }
        return res.status(200).send(profile);
      } catch (err) {
        return next(err);
      }
    },
  );
  app.use(errorHandler);
};
