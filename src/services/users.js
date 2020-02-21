import User from '../models/User';
import { ErrException } from '../api/middlewares/errorHandler';

export default class UserService {
  static async getSuggestionList(userId) {
    try {
      // console.log('userId = ', userId);
      const user = await User.getUserCompleteInfo(userId);
      const list = await User.getSuggestionList(user.rows[0]);
      return (list);
    } catch (err) {
      throw new ErrException({ id: 'fatal_error', description: 'could not fetch list of suggestions' });
    }
  }

  static async getProfileInfo(visitedId, visitorId) {
    try {
      console.log('here visited id = ', visitedId, ' visitorId = ', visitorId);
      const visitor = await User.getUserCompleteInfo(visitorId);
      const user = await User.getProfileCompleteInfo(visitedId, visitor.rows[0]);
      return (user);
    } catch (err) {
      throw new ErrException({ id: 'fatal_error', description: 'could not fetch Profile infos' });
    }
  }

  static async isComplete(userId) {
    try {
      const isComplete = await User.isComplete(userId);
      if (isComplete.rows[0].birthdate) {
        return (true);
      }
      return (false);
    } catch (err) {
      throw new ErrException({ id: 'fatal_error', description: 'could not check if profile is complete' });
    }
  }
}
