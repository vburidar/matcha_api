import { Router } from 'express';
import ProfileService from '../../services/profile';
import { requestValidator, rv } from '../middlewares/requestValidator';
import authValidator from '../middlewares/authValidator';
import { ErrException, errorHandler} from '../middlewares/errorHandler';
import { runInNewContext } from 'vm';

const route = Router();

export default (app) => {
  app.use('/profile', route);

  route.patch(
    '/',
    authValidator(true),
    // requestValidator({
    //   body: {
    //     // login: [rv.required(), rv.string()],
    //     // password: [rv.required(), rv.string(), rv.password()],
    //     // email: [rv.required(), rv.string(), rv.email()],
    //   },
    // }),
    async (req, res, next) => {
      try {
        const {
          user, interests, locations, pictures,
        } = req.body;
        if (interests.length < 8 && interests.length > 2) {
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
