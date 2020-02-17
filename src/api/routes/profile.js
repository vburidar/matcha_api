import { Router } from 'express';
import ProfileService from '../../services/profile';
import { requestValidator, rv } from '../middlewares/requestValidator';

const route = Router();

export default (app) => {
  app.use('/profile', route);

  route.patch(
    '/',
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
        const ret = await ProfileService.completeProfile(1, user, interests, locations, pictures);
        res.json(ret);
      } catch (err) {
        res.status(500).send(err.message);
      }
    },
  );
};
