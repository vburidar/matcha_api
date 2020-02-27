import Event from '../models/Event';
import { ErrException } from '../api/middlewares/errorHandler';

export default class EventService {
  static createScore(likesReceived, likesSent, match) {
    if (!likesReceived || !likesSent || !match) {
      return (0);
    }
    const score1 = likesReceived / (likesReceived + likesSent + 1);
    const score2 = (match / (likesSent + 1));
    return (score1 + score2);
  }

  static async createLike(visitedId, visitorId) {
    try {
      if (await Event.getBlock(visitedId, visitorId)) {
        throw new ErrException({ id: 'unauthorized', description: 'User is blocked' });
      }
      const like = await Event.createLike(visitedId, visitorId);
      const nbLikeVisitor = await Event.getNbLikes(visitorId);
      const nbLikeVisited = await Event.getNbLikes(visitedId);
      const scoreVisitor = this.createScore(nbLikeVisitor.nb_likes_received, nbLikeVisitor.nb_likes_sent,
        nbLikeVisitor.nb_match);
      const scoreVisited = this.createScore(nbLikeVisited.nb_likes_received, nbLikeVisited.nb_likes_sent,
        nbLikeVisited.nb_match);
      Event.updatePopularityScore(scoreVisitor, visitorId);
      Event.updatePopularityScore(scoreVisited, visitedId);
      return (like);
    } catch (err) {
      if (err.id) {
        throw (err);
      }
      throw new ErrException({ id: 'invalid_request', description: 'could not insert like' });
    }
  }

  static async deleteLike(visitedId, visitorId) {
    try {
      const like = await Event.deleteLike(visitedId, visitorId);
      const nbLikeVisitor = await Event.getNbLikes(visitorId);
      const nbLikeVisited = await Event.getNbLikes(visitedId);
      const scoreVisitor = this.createScore(nbLikeVisitor.nb_likes_received, nbLikeVisitor.nb_likes_sent,
        nbLikeVisitor.nb_match);
      const scoreVisited = this.createScore(nbLikeVisited.nb_likes_received, nbLikeVisited.nb_likes_sent,
        nbLikeVisited.nb_match);
      Event.updatePopularityScore(scoreVisitor, visitorId);
      Event.updatePopularityScore(scoreVisited, visitedId);
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
      const isBlocked = await Event.getBlock(visitedId, visitorId);
      if (isBlocked) {
        throw new ErrException({ id: 'unauthorized', description: 'User is blocked' });
      }
      const like = await Event.createReport(visitedId, visitorId, type);
      return (like);
    } catch (err) {
      if (err.id) {
        throw (err);
      }
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

  static async createVisit(visitedId, visitorId) {
    if (visitedId !== visitorId) {
      try {
        const like = await Event.createVisit(visitedId, visitorId);
        return (like);
      } catch (err) {
        throw new ErrException({ id: 'invalid_request', description: 'could not insert visit' });
      }
    }
    return ({ message: 'visited himself' });
  }

  static async getListEvent(userId) {
    try {
      const list = await Event.getListEvent(userId);
      return (list);
    } catch (err) {
      throw new ErrException({ id: 'invalid_request', description: 'could not fetch list event' });
    }
  }

  static async createNotification(userId, receiverId, type) {
    try {
      const notification = await Event.createNotification(userId, receiverId, type);
      return (notification);
    } catch (err) {
      throw new ErrException({ id: 'invalid_request', description: 'could not create notification' });
    }
  }

  static async getNotifications(userId) {
    try {
      const list = await Event.getNotifications(userId);
      return (list);
    } catch (err) {
      throw new ErrException({ id: 'invalid_request', description: 'could not fetch notifications list' });
    }
  }

  static async updateNotification(notificationId) {
    try {
      const update = await Event.updateNotification(notificationId);
      return (update);
    } catch (err) {
      throw new ErrException({ id: 'invalid_request', description: 'could not update notification' });
    }
  }
}
