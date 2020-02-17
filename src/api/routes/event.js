import { Router } from 'express';
import { requestValidator, rv } from '../middlewares/requestValidator';
import { errorHandler, ErrException } from '../middlewares/errorHandler';
import EventService from '../../services/event';

const route = Router();

export default (app) => {
  app.use('/event', route);

  route.post(
    '/like',
    async (req, res, next) => {
      try {
        const like = await (EventService.createLike(req.body.user_id, req.session.user_id));
        return res.status(200).send(like);
      } catch (err) {
        return next(err);
      }
    },
  );

  route.delete(
    '/like',
    async (req, res, next) => {
      try {
        const like = await (EventService.deleteLike(req.body.user_id, req.session.user_id));
        return res.status(200).send(like);
      } catch (err) {
        return next(err);
      }
    },
  );

  route.post(
    '/block',
    async (req, res, next) => {
      try {
        console.log('in route', req.body);
        const block = await (EventService.createBlock(req.body.user_id, req.session.user_id));
        return res.status(200).send(block);
      } catch (err) {
        return next(err);
      }
    },
  );

  route.delete(
    '/block',
    async (req, res, next) => {
      try {
        console.log('in route delete block', req.body);
        const block = await (EventService.deleteBlock(req.body.user_id, req.session.user_id));
        return res.status(200).send(block);
      } catch (err) {
        return next(err);
      }
    },
  );

  route.post(
    '/report',
    async (req, res, next) => {
      try {
        console.log('in route', req.body);
        const block = await (EventService.createReport(req.body.user_id, req.session.user_id, req.body.type));
        return res.status(200).send(block);
      } catch (err) {
        return next(err);
      }
    },
  );

  app.use(errorHandler);
};
