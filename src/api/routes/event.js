import { Router } from 'express';
import { requestValidator, rv } from '../middlewares/requestValidator';
import { errorHandler, ErrException } from '../middlewares/errorHandler';
import EventService from '../../services/event';
import authValidator from '../middlewares/authValidator';

const route = Router();

export default (app) => {
  app.use('/event', route);

  route.post(
    '/like',
    authValidator(true),
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
    authValidator(true),
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

  route.post(
    '/visits',
    authValidator(true),
    async (req, res, next) => {
      try {
        const visit = await (EventService.createVisit(req.body.user_id, req.session.user_id));
        return res.status(200).send(visit);
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

  route.post('/notifications',
    authValidator(true),
    async (req, res, next) => {
      try {
        const notification = await (EventService.createNotification(req.session.user_id, 
          req.body.receiverId, req.body.type));
        return res.status(200).send(notification);
      } catch (err) {
        return next(err);
      }
    });

  route.get('/notifications',
    authValidator(true),
    async (req, res, next) => {
      try {
        const list = await (EventService.getNotifications(req.session.user_id));
        return res.status(200).send(list);
      } catch (err) {
        return next(err);
      }
    });

  route.patch('/notifications',
    authValidator(true),
    async (req, res, next) => {
      try {
        const update = await (EventService.updateNotification(req.body.notificationId));
        return res.status(200).send(update);
      } catch (err) {
        return next(err);
      }
    });

  app.use(errorHandler);
};
