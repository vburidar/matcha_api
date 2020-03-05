import User from '../models/User';
import Event from '../models/Event';
import { ErrException } from '../api/middlewares/errorHandler';

export default class UserService {
  static async getSuggestionList(userId) {
    try {
      const user = await User.getUserCompleteInfo(userId);
      const list = await User.getSuggestionList(user.rows[0]);
      return (list);
    } catch (err) {
      throw new ErrException({ id: 'fatal_error', description: 'could not fetch list of suggestions' });
    }
  }

  static async getProfileInfo(visitedId, visitorId) {
    try {
      if (await Event.getBlock(visitedId, visitorId)) {
        throw new ErrException({ id: 'unauthorized', description: 'User is blocked' });
      }
      const visitor = await User.getUserCompleteInfo(visitorId);
      const user = await User.getProfileCompleteInfo(visitedId, visitor.rows[0]);
      console.log(user.rows);
      return (user);
    } catch (err) {
      if (err.id) {
        throw (err);
      }
      throw new ErrException({ id: 'fatal_error', description: 'could not fetch Profile infos' });
    }
  }

  static async getMatchesWithLastMessage(userId) {
    try {
      const users = await User.getUserWithLastMessage(userId);
      return (users);
    } catch (err) {
      throw new ErrException({ id: 'fatal_error', description: 'could not fetch users with last messages' });
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

  static async createMessage(userId, receiverId, content) {
    try {
      if (await Event.getBlock(userId, receiverId)) {
        throw new ErrException({ id: 'unauthorized', description: 'User is blocked' });
      }
      const message = await User.addMessage(userId, receiverId, content);
      return (message);
    } catch (err) {
      if (err.id) {
        throw (err);
      }
      throw new ErrException({ id: 'bad_request', description: 'could not insert message in database' });
    }
  }

  static async getMessages(userId, talkerId) {
    try {
      if (await Event.getBlock(userId, talkerId)) {
        throw new ErrException({ id: 'unauthorized', description: 'User is blocked' });
      }
      const messagesList = await User.getMessages(userId, talkerId);
      return (messagesList);
    } catch (err) {
      if (err.id) {
        throw (err);
      }
      throw new ErrException({ id: 'bad_request', description: 'could not fetch message List' });
    }
  }

  static async getListUsers(userId, data) {
    let location = {};
    const queryLocation = JSON.parse(data.location);
    if (queryLocation.type === 'default') {
      try {
        location = await User.getLocation(userId);
      } catch (err) {
        throw new ErrException({ id: 'bad_request', description: 'could not fetch user location' });
      }
    } else {
      location = { latitude: queryLocation.latitude, longitude: queryLocation.longitude };
    }
    try {
      return (User.getCustomList(userId, location, data));
    } catch (err) {
      throw new ErrException({ id: 'bad_request', description: 'could not fetch custom user list' });
    }
  }
}
