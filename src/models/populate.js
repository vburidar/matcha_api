import PostgresService from '../services/postgres';
import { interests } from '../../populate_data/populate';

export default class Populate {
  static async insertInterests() {
    Object.keys(interests).forEach(async (key) => {
      await PostgresService.query('INSERT INTO interests (name) VALUES ($1)', [interests[key]]);
    });
  }

  static async getSuggestionList(userLogin) {
    const list = await PostgresService.query(`
    WITH virtual_user AS (
        SELECT 
        users.id,
        EXTRACT (YEAR FROM AGE(users.birthdate)) AS age,
        sexual_preference,
        gender,
        latitude,
        longitude
    FROM (SELECT * FROM users WHERE login = $1) AS users
    INNER JOIN locations ON users.id = locations.user_id),
    virtual_interests AS (
    SELECT * FROM ( SELECT * FROM users_interests WHERE user_id = (SELECT id FROM virtual_user)) AS interests),
    nb_interest AS (
    SELECT COUNT(*) AS value FROM users_interests WHERE user_id = (SELECT id FROM virtual_user))
  
    SELECT
      interests.user_id, 
      interests.common_interests, 
      locations.distance,
      users.gender AS gender_receiver,
      users.sexual_preference::bit(4) AS pref_receiver,
      (SELECT gender FROM virtual_user)::int as gender_sender,
      (SELECT sexual_preference FROM virtual_user)::int as pref_sender,
      abs((SELECT age FROM virtual_user) - EXTRACT (YEAR FROM AGE(users.birthdate))) as age_difference,
      log(1 + (exp(1) - 1) * (common_interests::float / (SELECT value FROM nb_interest))) AS score_interest,
      1 / (exp(abs((SELECT age FROM virtual_user) - EXTRACT (YEAR FROM AGE(users.birthdate)))/10)) as score_age,
      1 / (exp(distance / 10)) AS score_distance,
      log(1 + 1.7 * (common_interests::float / (SELECT value FROM nb_interest))) + 1 / (exp(abs((SELECT age FROM virtual_user) - EXTRACT (YEAR FROM AGE(users.birthdate)))/10)) + 1 / (exp(distance / 10)) AS score
    FROM users

    INNER JOIN
      (SELECT
        user_id, 
        111 * |/((latitude - (SELECT latitude FROM virtual_user))^2 + (longitude - (SELECT longitude FROM virtual_user))^2) AS distance 
      FROM locations) AS locations
    ON locations.user_id = users.id

    INNER JOIN
      (SELECT
        user_id,
        COUNT (*) AS common_interests
      FROM (SELECT  * FROM users_interests WHERE user_id != (SELECT id FROM virtual_user)) AS test1

      INNER JOIN
      (SELECT interest_id FROM users_interests WHERE user_id = (SELECT id FROM virtual_user)) AS test2
      ON test1.interest_id = test2.interest_id
      GROUP BY user_id) AS interests

    ON locations.user_id = interests.user_id

    WHERE locations.distance < 20
    AND (SELECT sexual_preference FROM virtual_user) & users.gender != 0
    AND (SELECT gender FROM virtual_user) & users.sexual_preference != 0
    ORDER BY score DESC`, [userLogin]);
    return (list);
  }

  static async createLike(visitorLogin, visitedId) {
    const like = await PostgresService.query(`
      WITH virtual_user AS(
        SELECT id FROM users WHERE login = $1
      )
      INSERT INTO likes (receiver_id, sender_id) VALUES ((SELECT id FROM virtual_user) , $2)`, [visitorLogin, visitedId]);
    return (like);
  }

  static async computePopularityScore(userLogin) {
    const popularityScore = await PostgresService.query(`
    WITH virtual_user AS (SELECT 
      id FROM users
      WHERE login = $1),
    
    virtual_event AS (
    SELECT
            CASE WHEN sent.nb_likes_sent::INTEGER IS NULL THEN 1 ELSE sent.nb_likes_sent END,
            CASE WHEN received.nb_likes_received::INTEGER IS NULL THEN 0 ELSE received.nb_likes_received END,
            CASE WHEN totallikes.nb_match IS NULL THEN 0 ELSE totallikes.nb_match END
          FROM (
          SELECT
            sender_id,
            COUNT(*) as nb_likes_sent
          FROM likes
          WHERE sender_id = (SELECT id FROM virtual_user)
          GROUP BY sender_id) AS sent
          
          FULL OUTER JOIN
          
          (SELECT 
            receiver_id,
            COUNT(*) as nb_likes_received
          FROM likes
          WHERE receiver_id = (SELECT id FROM virtual_user)
          GROUP BY receiver_id) AS received
    
          ON sent.sender_id = received.receiver_id
          
          FULL OUTER JOIN
    
          (SELECT 
            count(*) AS nb_match,
            (SELECT id FROM virtual_user) as user_id
            FROM (
            SELECT * FROM likes AS likes1
            INNER JOIN (
              SELECT * FROM likes
            ) AS likes2
            ON likes1.sender_id = likes2.receiver_id
            WHERE likes1.receiver_id = (SELECT id FROM virtual_user) AND likes2.sender_id = (SELECT id FROM virtual_user) AND likes2.created_at < likes1.created_at
          ) AS totallikes) AS totallikes
    
          ON totallikes.user_id = sent.sender_id),
          
          virtual_score AS (
          SELECT 
          nb_match::float / nb_likes_sent::float
          + nb_likes_received::float / (nb_likes_sent::float + nb_likes_received::float) AS score 
          FROM virtual_event)
          
          UPDATE users
          SET popularity_score = (SELECT score FROM virtual_score) * 50
          WHERE login= $1`, [userLogin]);
    return (popularityScore);
  }
}
