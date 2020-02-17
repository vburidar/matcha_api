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

  static async createVisit(visitedId, visitorId) {
    const visit = await PostgresService.pool.query(`
    INSERT INTO visits (receiver_id, sender_id) VALUES ($1, $2)`, [visitedId, visitorId]);
    return visit;
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

  static async deleteVisit(visitedId, visitorId) {
    console.log('visited', visitedId, 'visitor', visitorId);
    const user = await PostgresService.pool.query(`
    DELETE FROM visits
    WHERE receiver_id = $1 
    AND sender_id = $2`, [visitedId, visitorId]);
    return user;
  }

  static async getListEvent(userId) {
    console.log('in model user_id = ', userId);
    const list = await PostgresService.query(`
    SELECT * FROM 
    (  
      SELECT
        receiver_id,
        created_at,
        'likes' AS type,
        sender_id 
      FROM likes
      WHERE likes.receiver_id = $1

      UNION
      
      SELECT
          receiver_id,
          created_at,
          'visits' AS type,
          sender_id 
        FROM visits
      WHERE visits.receiver_id = $1
      
      ) AS event
      
      INNER JOIN (
        SELECT 
        first_name,
        id
        FROM users) AS users
      ON event.sender_id = users.id

      INNER JOIN (
        SELECT
        user_id,
        path
        FROM images
        WHERE is_profile = TRUE) AS images
      ON event.sender_id = images.user_id
      
      ORDER BY created_at DESC`, [userId]);
    console.log(list.rows);
    return (list);
  }
}
