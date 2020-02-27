import { ErrException } from './errorHandler';

export default function authValidator(ConnectionRequired) {
  return (req, res, next) => {
    if (ConnectionRequired) {
      if (req.session.user_id) {
        return next();
      }
      throw new ErrException({ id: 'not_authorized', description: 'this request can only be executed by a logged user' });
    }
    return next();
  };
}
