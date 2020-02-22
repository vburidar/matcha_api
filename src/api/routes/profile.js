import { Router } from 'express';
import ProfileService from '../../services/profile';
import { requestValidator, rv } from '../middlewares/requestValidator';
import authValidator from '../middlewares/authValidator';

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
    async (req, res) => {
      try {
        const {
          user, interests, locations, pictures,
        } = req.body;
        const ret = await ProfileService.completeProfile(req.session.user_id, user, interests, locations, pictures);
        res.json(ret);
      } catch (err) {
        res.status(500).send(err.message);
      }
    },
  );
};
