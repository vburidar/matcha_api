import { Router } from 'express';
import { runInNewContext } from 'vm';
import ProfileService from '../../services/profile';
import { requestValidator, rv } from '../middlewares/requestValidator';
import authValidator from '../middlewares/authValidator';
import { ErrException, errorHandler} from '../middlewares/errorHandler';

const route = Router();

export default (app) => {
  app.use('/profile', route);

  route.patch(
    '/',
    authValidator(true),
    requestValidator({
      body: {
        locations: [rv.required(), rv.locations()],
        pictures: [rv.required(), rv.pictures()],
        user: [rv.required(), rv.user()],
        interests: [rv.required(), rv.interests()],
      },
    }),
    async (req, res, next) => {
      try {
        const {
          user, interests, locations, pictures,
        } = req.body;
        if (interests.length < 8 && interests.length > 2 && pictures.length > 0 && pictures.length < 6) {
          const ret = await ProfileService.completeProfile(req.session.user_id, user, interests, locations, pictures);
          res.json(ret);
        } else {
          throw new ErrException({ id: 'invalid_nb_of_interests', description: 'number of interests between 3 and 7' });
        }
      } catch (err) {
        next(err);
      }
    },
  );

  app.use(errorHandler);
};
