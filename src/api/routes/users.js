import { Router } from 'express';
import { requestValidator, rv } from '../middlewares/requestValidator';
import { errorHandler, ErrException } from '../middlewares/errorHandler';
import UserService from '../../services/users';
import ProfileService from '../../services/profile';
import authValidator from '../middlewares/authValidator';

const route = Router();

export default (app) => {
  app.use('/users', route);

  route.get(
    '/getSuggestionList',
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
    '/getProfileInfo/:user_id',
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

  route.post('/message',
    authValidator(true),
    async (req, res, next) => {
      try {
        const message = await UserService.createMessage(req.session.user_id, req.body.receiverId, req.body.content);
        return (res.status(200).send(message));
      } catch (err) {
        return next(err);
      }
    });

  route.get('/message',
    authValidator(true),
    async (req, res, next) => {
      try {
        const messagesList = await UserService.getMessages(req.session.user_id, req.body.talkerId);
        return (res.status(200).send(messagesList));
      } catch (err) {
        return next(err);
      }
    });

  app.use(errorHandler);
};
