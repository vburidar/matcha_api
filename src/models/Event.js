import PostgresService from '../services/postgres';
import UserService from '../services/users';

export default class User {
  static async createLike(visitedId, visitorId) {
    const user = await PostgresService.pool.query(`
    INSERT INTO likes (receiver_id, sender_id) VALUES ($1, $2)`, [visitedId, visitorId]);
    return user;
  }

  static async createBlock(visitedId, visitorId) {
    console.log('visited', visitedId, 'visitor', visitorId);
    const user = await PostgresService.pool.query(`
    INSERT INTO blocks (receiver_id, sender_id) VALUES ($1, $2)`, [visitedId, visitorId]);
    return user;
  }

  static async createReport(visitedId, visitorId, type) {
    console.log('visited', visitedId, 'visitor', visitorId, 'type', type);
    const user = await PostgresService.pool.query(`
    INSERT INTO reports (receiver_id, sender_id, type) VALUES ($1, $2, $3)`, [visitedId, visitorId, type]);
    return user;
  }

  static async deleteLike(visitedId, visitorId) {
    console.log('visited', visitedId, 'visitor', visitorId);
    const user = await PostgresService.pool.query(`
    DELETE FROM likes
    WHERE receiver_id = $1 
    AND sender_id = $2`, [visitedId, visitorId]);
    return user;
  }

  static async deleteBlock(visitedId, visitorId) {
    console.log('visited', visitedId, 'visitor', visitorId);
    const user = await PostgresService.pool.query(`
    DELETE FROM blocks
    WHERE receiver_id = $1 
    AND sender_id = $2`, [visitedId, visitorId]);
    return user;
  }
}
