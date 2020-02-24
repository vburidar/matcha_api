import { Router } from 'express';
import DbService from '../../services/db';
import PopulateService from '../../services/populate';

const route = Router();

export default (app) => {
  app.use('/db', route);

  route.post(
    '/reset',
    async (req, res, next) => {
      try {
        DbService.resetDatabase();
        return res.status(200).send('RESET DONE');
      } catch (err) {
        console.log(err);
        return next(err);
      }
    },
  );

  route.post(
    '/setup',
    async (req, res, next) => {
      try {
        DbService.setupDatabase();
        return res.status(200).send('SETUP DONE');
      } catch (err) {
        console.log(err);
        return next(err);
      }
    },
  );

  route.post(
    '/populate',
    async (req, res, next) => {
      try {
        PopulateService.populate();
        return res.status(200).send('SUCCESS');
      } catch (err) {
        console.log(err);
        return next(err);
      }
    },
  );
};
