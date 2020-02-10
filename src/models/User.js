
import PostgresService from '../services/postgres';

export default class User {
  static async create(login, hashedPassword, salt, email) {
    const user = await PostgresService.pool.query(
      'INSERT INTO users (login, password, salt, email) VALUES ($1, $2, $3, $4) RETURNING id, login, email',
      [
        login,
        hashedPassword,
        salt,
        email,
      ],
    );
    return (user.rows[0]);
  }

  static async getUserByLogin(login) {
    const user = await PostgresService.pool.query(
      `SELECT
        *
      FROM users
      WHERE
        login=$1`,
      [login],
    );
    return (user.rows[0]);
  }

  static async getUserByEmail(email) {
    const user = await PostgresService.pool.query(
      `SELECT
        *
      FROM users
      WHERE
        Email=$1`,
      [email],
    );
    return (user.rows[0]);
  }

  static async updateValidate(login) {
    const validate = await PostgresService.pool.query(
      `UPDATE
      users
      SET validated=$1
      WHERE login=$2`,
      [true, login],
    );
    return (validate);
  }

  static async updatePwd(newPwdData, login) {
    const update = await PostgresService.pool.query(
      `UPDATE users
      SET password = $1,
      salt = $2
      WHERE login = $3
      RETURNING id, login, email`,
      [newPwdData[0], newPwdData[1], login],
    );
    return (update);
  }

  static async getUserCompleteInfo(userId) {
    const user = await PostgresService.pool.query(
      `SELECT 
        users.id,
        locations.latitude,
        locations.longitude,
        users_interests.common_interests AS nb_interests,
        EXTRACT (YEAR FROM AGE(users.birthdate)) AS age,
        users.sexual_preference,
        users.gender

      FROM users
      INNER JOIN locations
      ON users.id = locations.user_id
      INNER JOIN (
        SELECT
          user_id,
          COUNT (*) AS common_interests 
          FROM users_interests
          GROUP BY user_id
          ) AS users_interests
      ON users.id = users_interests.user_id
      INNER JOIN images
        ON users.id = images.user_id
        WHERE users.id = $1`, [userId],
    );
    return (user);
  }

  static async getSuggestionList(user) {
    const suggestionList = await PostgresService.pool.query(`
    SELECT
      interests.user_id, 
      interests.common_interests, 
      locations.distance,
      images.path,
      users.gender AS gender_receiver,
      users.sexual_preference::bit(4) AS pref_receiver,
      $7::int as gender_sender,
      $6::int as pref_sender,
      abs($5 - EXTRACT (YEAR FROM AGE(users.birthdate))) as age_difference,
      
      log(1 + (exp(1) - 1) * (common_interests::float / $4)) AS score_interest,
      1 / (exp(abs($5 - EXTRACT (YEAR FROM AGE(users.birthdate)))/10)) as score_age,
      1 / (exp(distance / 10)) AS score_distance,
      log(1 + 1.7 * (common_interests::float / $4)) + 1 / (exp(abs($5 - EXTRACT (YEAR FROM AGE(users.birthdate)))/10)) + 1 / (exp(distance / 10)) AS score
    FROM users
    
    INNER JOIN
      (SELECT
        user_id, 
        111 * |/((latitude - $2)^2 + (longitude - $3)^2) AS distance 
      FROM locations) AS locations
    ON locations.user_id = users.id

    INNER JOIN (
      SELECT * FROM images 
      WHERE is_profile = true) AS images
    ON images.user_id = users.id
    
    INNER JOIN
      
      (SELECT
        user_id,
        COUNT (*) AS common_interests
      FROM
        (SELECT  * FROM users_interests WHERE user_id != $1) AS test1

      INNER JOIN
        (SELECT interest_id FROM users_interests WHERE user_id = $1) AS test2
      ON test1.interest_id = test2.interest_id
      GROUP BY user_id) AS interests
    
    ON locations.user_id = interests.user_id

    WHERE locations.distance < 20
    AND $6 & users.gender != 0
    AND $7 & users.sexual_preference != 0
    ORDER BY score DESC`, [user.id, user.latitude, user.longitude, user.nb_interests, user.age, user.sexual_preference, user.gender]);
    return (suggestionList);
  }
}
