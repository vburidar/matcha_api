import PostgresService from '../services/postgres';

export default class User {
  static async createLike(receiverId, senderId) {
    const user = await PostgresService.query(
      'INSERT INTO likes (receiver_id, sender_id) VALUES ($1, $2) RETURNING *',
      [receiverId, senderId],
    );
    return user;
  }

  static async getMatches(userId) {
    const matches = await PostgresService.pool.query(
      `
      WITH
      receivers AS (
        SELECT
          receiver_id
        FROM likes
        WHERE likes.sender_id = $1
      ),
      senders AS (
        SELECT
          sender_id
        FROM likes
        WHERE likes.receiver_id = $1
      )
      SELECT receiver_id AS id FROM receivers
      INNER JOIN senders ON senders.sender_id = receivers.receiver_id    
      `,
      [userId],
    );
    return matches.rows;
  }

  static async createBlock(visitedId, visitorId) {
    const user = await PostgresService.pool.query(`
    INSERT INTO blocks (receiver_id, sender_id) VALUES ($1, $2)`, [visitedId, visitorId]);
    return user;
  }

  static async createReport(visitedId, visitorId, type) {
    const user = await PostgresService.pool.query(`
    INSERT INTO reports (receiver_id, sender_id, type) VALUES ($1, $2, $3)`, [visitedId, visitorId, type]);
    return user;
  }

  static async createVisit(visitedId, visitorId) {
    const visit = await PostgresService.pool.query(
      `
      INSERT INTO visits (receiver_id, sender_id)
      SELECT $1, $2
      WHERE NOT EXISTS (
        SELECT *
        FROM visits
        WHERE receiver_id = $1 AND sender_id = $2 AND created_at > (NOW() - INTERVAL '1 HOUR')
      )
      RETURNING *
      `,
      [visitedId, visitorId],
    );
    return visit.rows[0];
  }

  static async deleteLike(visitedId, visitorId) {
    const user = await PostgresService.pool.query(`
    DELETE FROM likes
    WHERE receiver_id = $1 
    AND sender_id = $2`, [visitedId, visitorId]);
    return user;
  }

  static async deleteBlock(visitedId, visitorId) {
    const user = await PostgresService.pool.query(`
    DELETE FROM blocks
    WHERE receiver_id = $1 
    AND sender_id = $2`, [visitedId, visitorId]);
    return user;
  }

  static async deleteVisit(visitedId, visitorId) {
    const user = await PostgresService.pool.query(`
    DELETE FROM visits
    WHERE receiver_id = $1 
    AND sender_id = $2`, [visitedId, visitorId]);
    return user;
  }

  static async getListEvent(userId) {
    const list = await PostgresService.query(`
    SELECT 
    receiver_id,
    created_at,
    EXTRACT (YEAR FROM AGE (NOW(), created_at)) AS years_since,
    EXTRACT (MONTH FROM AGE (NOW(), created_at)) AS months_since,
    EXTRACT (DAY FROM AGE (NOW(), created_at)) AS days_since,
    EXTRACT (HOUR FROM AGE (NOW(), created_at)) AS hours_since,
    EXTRACT (MINUTE FROM AGE (NOW(), created_at)) AS minute_since,
    type,
    sender_id,
    first_name,
    user_id,
    CASE
      WHEN path NOT SIMILAR TO 'https*://_*' THEN concat('${process.env.APP_URL}/pictures/', path)
      ELSE path
    END
     FROM 
    (  
      SELECT
        receiver_id,
        created_at,
        'like' AS type,
        sender_id 
      FROM likes
      WHERE likes.receiver_id = $1

      UNION
      
      SELECT
          receiver_id,
          created_at,
          'visit' AS type,
          sender_id 
        FROM visits
      WHERE visits.receiver_id = $1

      UNION

      SELECT
        like1.receiver_id,
        CASE WHEN like1.created_at > like2.created_at THEN like1.created_at ELSE like2.created_at END AS created_at,
        'match' as type,
        like1.sender_id
      FROM
        (SELECT * FROM likes WHERE receiver_id = $1) AS like1 
        INNER JOIN
        (SELECT * FROM likes WHERE sender_id = $1) AS like2
        ON like1.sender_id = like2.receiver_id

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
    return (list);
  }

  static async getNbLikes(userId) {
    const list = await PostgresService.query(`
      SELECT 
        sent.nb_likes_sent::INTEGER,
        received.nb_likes_received::INTEGER,
        totallikes.nb_match
      FROM (
      SELECT
        $1::integer AS sender_id,
        COUNT(*) as nb_likes_sent
      FROM likes
      WHERE sender_id = $1) AS sent
      
      INNER JOIN 
      
      (SELECT 
        $1::integer AS receiver_id,
        COUNT(*) as nb_likes_received
      FROM likes
      WHERE receiver_id = $1) AS received

      ON sent.sender_id = received.receiver_id
      
      INNER JOIN

      (SELECT 
        count(*) AS nb_match,
        $1::integer AS user_id
        FROM (
        SELECT * FROM likes AS likes1
        INNER JOIN (
          SELECT * FROM likes
        ) AS likes2
        ON likes1.sender_id = likes2.receiver_id
        WHERE likes1.receiver_id = $1 AND likes2.sender_id = $1 AND likes2.created_at < likes1.created_at
      ) AS totallikes) AS totallikes

      ON totallikes.user_id = sent.sender_id
      `, [userId]);
    return (list.rows[0]);
  }

  static async getAverageMatchingRatePerGivenLike() {
    const ret = await PostgresService.query(`
    SELECT 
      AVG(nb_match)
      FROM
      (
    SELECT
      CASE WHEN nb_match IS NULL THEN 0 ELSE nb_match END AS nb_match
    FROM(
    SELECT 
        COUNT(*) AS nb_match,
        send1 AS sender_id
        FROM (SELECT * FROM(
          SELECT
            sender_id as send1,
            receiver_id as rec1,
            created_at
          FROM likes) AS likes1
          INNER JOIN (
          SELECT 
            receiver_id as rec2,
            sender_id as send2,
            created_at
          FROM likes
        ) AS likes2
        ON likes1.send1 = likes2.rec2 AND likes2.send2 = likes1.rec1
        WHERE likes1.created_at < likes2.created_at
      ) AS totallikes
      GROUP BY totallikes.send1 ) as totallikes
      
      FULL OUTER JOIN
      (SELECT id FROM users) AS users 
      ON totallikes.sender_id = users.id
      ) AS test

    `);
    return (ret.rows[0]);
  }

  static async updatePopularityScore(score, userId) {
    const ret = await PostgresService.query(`
    UPDATE users
    SET popularity_score = $1
    WHERE id = $2`, [parseInt(score * 100, 10), userId]);
    return (ret.rows[0]);
  }

  static async createNotification(userId, receiverId, type) {
    const notification = await PostgresService.query(
      `
      WITH
        newone AS (
          INSERT INTO notifications (receiver_id, sender_id, type)
          VALUES ($1, $2, $3)
          RETURNING *
        )
      SELECT
        newone.id,
        newone.sender_id AS "senderId",
        newone.receiver_id AS "receiverId",
        newone.read,
        newone.type,
        newone.created_at AS "createdAt",
        users.first_name AS "firstName",
        EXTRACT (YEAR FROM AGE (NOW(), created_at)) AS "yearsSince",
        EXTRACT (MONTH FROM AGE (NOW(), created_at)) AS "monthsSince",
        EXTRACT (DAY FROM AGE (NOW(), created_at)) AS "daysSince",
        EXTRACT (HOUR FROM AGE (NOW(), created_at)) AS "hoursSince",
        EXTRACT (MINUTE FROM AGE (NOW(), created_at)) AS "minuteSince"
      FROM newone
      INNER JOIN users ON newone.sender_id = users.id
      `,
      [userId, receiverId, type],
    );
    return notification.rows[0];
  }

  static async getNotifications(userId) {
    const ret = await PostgresService.query(`
    SELECT * FROM notifications
    WHERE receiver_id = $1`, [userId]);
    return (ret.rows);
  }

  static async updateNotification(notificationId) {
    const ret = await PostgresService.query(`
    UPDATE notifications SET read = TRUE
    WHERE id = $1`, [notificationId]);
    return (ret);
  }

  static async getAllNotificationsFromUser(userId) {
    const notifications = await PostgresService.query(
      `SELECT
        notifications.id,
        notifications.sender_id AS "senderId",
        notifications.receiver_id AS "receiverId",
        notifications.read,
        notifications.type,
        notifications.created_at AS "createdAt",
        users.first_name AS "firstName",
        EXTRACT (YEAR FROM AGE (NOW(), created_at)) AS "yearsSince",
        EXTRACT (MONTH FROM AGE (NOW(), created_at)) AS "monthsSince",
        EXTRACT (DAY FROM AGE (NOW(), created_at)) AS "daysSince",
        EXTRACT (HOUR FROM AGE (NOW(), created_at)) AS "hoursSince",
        EXTRACT (MINUTE FROM AGE (NOW(), created_at)) AS "minuteSince"
      FROM notifications
      INNER JOIN users ON users.id = notifications.sender_id
      WHERE receiver_id = $1
      ORDER BY notifications.created_at DESC`,
      [userId],
    );
    return notifications.rows;
  }

  static async markAllNotificationsAsRead(userId) {
    const notifications = await PostgresService.query(
      `WITH
      notif AS (
        UPDATE notifications SET read = TRUE
        WHERE receiver_id = $1
        RETURNING *
      )
      SELECT
        notif.id,
        notif.sender_id AS "senderId",
        notif.receiver_id AS "receiverId",
        notif.read,
        notif.type,
        notif.created_at AS "createdAt",
        users.first_name AS "firstName",
        EXTRACT (YEAR FROM AGE (NOW(), created_at)) AS "yearsSince",
        EXTRACT (MONTH FROM AGE (NOW(), created_at)) AS "monthsSince",
        EXTRACT (DAY FROM AGE (NOW(), created_at)) AS "daysSince",
        EXTRACT (HOUR FROM AGE (NOW(), created_at)) AS "hoursSince",
        EXTRACT (MINUTE FROM AGE (NOW(), created_at)) AS "minuteSince"
      FROM notif
      INNER JOIN users ON users.id = notif.sender_id
      ORDER BY notif.created_at DESC`,
      [userId],
    );
    return notifications.rows;
  }

  static async getBlock(visitorId, visitedId) {
    const block = await PostgresService.query(`
      SELECT * FROM blocks 
    WHERE (sender_id = $1 AND receiver_id = $2)
    OR (sender_id = $2 AND receiver_id = $1)`, [visitorId, visitedId]);
    return (block.rows.length > 0);
  }

  static async getBlockGiver(visitorId, visitedId) {
    const block = await PostgresService.query(`
    SELECT * FROM blocks
    WHERE (sender_id = $1 AND receiver_id = $2)
    OR (sender_id = $2 AND receiver_id = $1)`, [visitorId, visitedId]);
    return (block);
  }
}
