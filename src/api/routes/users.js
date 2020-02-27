import { Router } from 'express';
import { errorHandler, ErrException } from '../middlewares/errorHandler';
import UserService from '../../services/users';
import ProfileService from '../../services/profile';
import authValidator from '../middlewares/authValidator';
import User from '../../models/User';

const route = Router();

export default (app) => {
  app.use('/users', route);

  route.get(
    '/suggestions',
    authValidator(true),
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

  route.get('/status',
    authValidator(false),
    async (req, res, next) => {
      if (req.session.user_id) {
        try {
          const profileIsComplete = await UserService.isComplete(req.session.user_id);
          return (res.status(200).send({
            user_id: req.session.user_id,
            connected: true,
            profileIsComplete,
          }));
        } catch (err) {
          return next(err);
        }
      }
      return (res.status(200).send({ connected: false }));
    });

  route.get('/custom',
    authValidator(true),
    async (req, res, next) => {
      try {
        const userList = await UserService.getListUsers(req.session.user_id, req.query);
        return (res.status(200).send(userList));
      } catch (err) {
        return next(err);
      }
    });

  route.get('/message',
    authValidator(true),
    async (req, res, next) => {
      try {
        const messages = await User.getMessages(req.session.user_id, req.query.talkerId);
        return res.status(200).send(messages);
      } catch (err) {
        return next(err);
      }
    });

  route.get(
    '/:user_id',
    authValidator(true),
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

  app.use(errorHandler);
};
