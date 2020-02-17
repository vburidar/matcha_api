import Event from '../models/Event';
import { ErrException } from '../api/middlewares/errorHandler';

export default class EventService {
  static async createLike(visitedId, visitorId) {
    try {
      const like = await Event.createLike(visitedId, visitorId);
      return (like);
    } catch (err) {
      throw new ErrException({ id: 'invalid_request', description: 'could not insert like' });
    }
  }

  static async deleteLike(visitedId, visitorId) {
    try {
      const like = await Event.deleteLike(visitedId, visitorId);
      return (like);
    } catch (err) {
      throw new ErrException({ id: 'invalid_request', description: 'could not delete like' });
    }
  }

  static async createBlock(visitedId, visitorId) {
    try {
      const like = await Event.createBlock(visitedId, visitorId);
      return (like);
    } catch (err) {
      throw new ErrException({ id: 'invalid_request', description: 'could not insert block' });
    }
  }

  static async deleteBlock(visitedId, visitorId) {
    try {
      const like = await Event.deleteBlock(visitedId, visitorId);
      return (like);
    } catch (err) {
      throw new ErrException({ id: 'invalid_request', description: 'could not delete like' });
    }
  }

  static async createReport(visitedId, visitorId, type) {
    try {
      const like = await Event.createReport(visitedId, visitorId, type);
      return (like);
    } catch (err) {
      throw new ErrException({ id: 'invalid_request', description: 'could not insert report' });
    }
  }

  static async deleteReport(visitedId, visitorId, type) {
    try {
      const like = await Event.deleteReport(visitedId, visitorId, type);
      return (like);
    } catch (err) {
      throw new ErrException({ id: 'invalid_request', description: 'could not delete report' });
    }
  }
}
