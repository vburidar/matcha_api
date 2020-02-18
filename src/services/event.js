import Event from '../models/Event';
import { ErrException } from '../api/middlewares/errorHandler';
import User from '../models/Event';

function createScore(likesReceived, likesSent, match, avgMatch) {
  console.log('rec', likesReceived, 'sent', likesSent, 'match', match, 'avgmatch', avgMatch);
  const score1 = likesReceived / (likesReceived + likesSent + 1);
  const score2 = (match / (likesSent + 1));
  return (score1 + score2);
}

export default class EventService {
  static async createLike(visitedId, visitorId) {
    try {
      const like = await Event.createLike(visitedId, visitorId);
      const nbLikeVisitor = await Event.getNbLikes(visitorId);
      const nbLikeVisited = await Event.getNbLikes(visitedId);
      const avgMatch = await Event.getAverageMatchingRatePerGivenLike();
      const scoreVisitor = createScore(nbLikeVisitor.nb_likes_received, nbLikeVisitor.nb_likes_sent,
        nbLikeVisitor.nb_match, avgMatch.avg);
      const scoreVisited = createScore(nbLikeVisited.nb_likes_received, nbLikeVisited.nb_likes_sent,
        nbLikeVisited.nb_match, avgMatch.avg);
      Event.updatePopularityScore(scoreVisitor, visitorId);
      Event.updatePopularityScore(scoreVisited, visitedId);
      return (like);
    } catch (err) {
      throw new ErrException({ id: 'invalid_request', description: 'could not insert like' });
    }
  }

  static async deleteLike(visitedId, visitorId) {
    try {
      const like = await Event.deleteLike(visitedId, visitorId);
      const nbLikeVisitor = await Event.getNbLikes(visitorId);
      const nbLikeVisited = await Event.getNbLikes(visitedId);
      const avgMatch = await Event.getAverageMatchingRatePerGivenLike();
      const scoreVisitor = createScore(nbLikeVisitor.nb_likes_received, nbLikeVisitor.nb_likes_sent,
        nbLikeVisitor.nb_match, avgMatch.avg);
      const scoreVisited = createScore(nbLikeVisited.nb_likes_received, nbLikeVisited.nb_likes_sent,
        nbLikeVisited.nb_match, avgMatch.avg);
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

  static async createVisit(visitedId, visitorId) {
    if (visitedId != visitorId) {
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
}
