import { Router } from 'express';
import { requestValidator, rv } from '../middlewares/requestValidator';
import { errorHandler, ErrException } from '../middlewares/errorHandler';
import EventService from '../../services/event';
import authValidator from '../middlewares/authValidator';

const route = Router();

export default (app) => {
  app.use('/event', route);

  route.post(
    '/block',
    authValidator(true),
    async (req, res, next) => {
      try {
        const block = await (EventService.createBlock(req.body.user_id, req.session.user_id));
        return res.status(200).send(block);
      } catch (err) {
        return next(err);
      }
    },
  );

  route.delete(
    '/block',
    authValidator(true),
    async (req, res, next) => {
      try {
        const block = await (EventService.deleteBlock(req.body.user_id, req.session.user_id));
        return res.status(200).send(block);
      } catch (err) {
        return next(err);
      }
    },
  );

  route.post(
    '/report',
    authValidator(true),
    async (req, res, next) => {
      try {
        const block = await (EventService.createReport(req.body.user_id, req.session.user_id, req.body.type));
        return res.status(200).send(block);
      } catch (err) {
        return next(err);
      }
    },
  );

  route.get('/',
    authValidator(true),
    async (req, res, next) => {
      try {
        const listEvent = await (EventService.getListEvent(req.session.user_id));
        return res.status(200).send(listEvent);
      } catch (err) {
        return next(err);
      }
    });

  app.use(errorHandler);
};
