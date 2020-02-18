
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

  static toSnakeCase(data) {
    return Object.keys(data)
      .reduce((acc, key) => {
        const newKey = key.replace(/\W+/g, ' ')
          .split(/ |\B(?=[A-Z])/)
          .map((word) => word.toLowerCase())
          .join('_');

        return {
          ...acc,
          [newKey]: data[key],
        };
      }, {});
  }

  static async update(id, rawData, { inTransaction }) {
    const data = this.toSnakeCase(rawData);

    const queryText = `
      UPDATE users SET
      ${Object.keys(data).map((el, index) => `${el}=$${index + 2}`)}
      WHERE id=$1
      RETURNING *
    `;

    const params = [
      id,
      ...Object.values(data),
    ];

    const user = await PostgresService.query(
      queryText,
      params,
      inTransaction,
    );

    return user.rows[0];
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

  static async attachInterests(id, interestsParams, { inTransaction }) {
    const interests = (interestsParams instanceof Array) ? interestsParams : [interestsParams];

    let queryText = `
    WITH
      existingones AS (
          SELECT *
          FROM users_interests
          WHERE user_id = $1 AND interest_id IN (${interests.map((interest, index) => `$${index + 2}`)})
      ),
    `;

    interests.forEach((interest, index) => {
      queryText += `
      new${index + 1} AS (
        INSERT INTO users_interests (user_id, interest_id)
        SELECT $1, $${index + 2}
        WHERE NOT EXISTS (
            SELECT *
            FROM users_interests
            WHERE user_id = $1 AND interest_id = $${index + 2}
        )
        RETURNING *
      )${index + 1 < interests.length ? ',' : ''}
      `;
    });

    queryText += 'SELECT * FROM existingones UNION ';

    interests.forEach((interest, index) => {
      queryText += `SELECT * FROM new${index + 1} ${index + 1 < interests.length ? 'UNION ' : ''}`;
    });

    const usersInterests = await PostgresService.query(
      queryText,
      [
        id,
        ...interests.map((interest) => interest.id),
      ],
      inTransaction,
    );

    return usersInterests.rows;
  }

  static async getProfileCompleteInfo(visitedId, visitor) {
    const profile = await PostgresService.pool.query(`
      SELECT 
        users.id,
        users.first_name,
        users.last_name,
        users.description,
        images_not_profile.list_images,
        image_profile.path,
        locations.latitude,
        locations.longitude,
        CASE WHEN visitor_received_like.sender_id IS NULL THEN FALSE ELSE TRUE END as visited_liked_visitor,
        CASE WHEN visitor_received_block.sender_id IS NULL THEN FALSE ELSE TRUE END as visited_blocked_visitor,
        CASE WHEN visitor_sent_like.sender_id IS NULL THEN FALSE ELSE TRUE END as visitor_liked_visited,
        CASE WHEN visitor_sent_block.sender_id IS NULL THEN FALSE ELSE TRUE END as visitor_blocked_visited,
        111 * |/((latitude - $2)^2 + (longitude - $3)^2) AS distance,
        users_interests.nb_interests AS nb_interests,
        users_interests.list_interests,
        EXTRACT (YEAR FROM AGE(users.birthdate)) AS age,
        users.sexual_preference,
        users.gender

      FROM users
      
      INNER JOIN locations
      ON users.id = locations.user_id
      
      INNER JOIN (
        SELECT
          user_id,
          COUNT (*) AS nb_interests,
          ARRAY_TO_STRING(ARRAY_AGG(interests.name), ',') AS list_interests
          FROM users_interests INNER JOIN interests ON users_interests.interest_id = interests.id
          GROUP BY user_id
          ) AS users_interests
      
      ON users.id = users_interests.user_id

      FULL OUTER JOIN 
        (SELECT * FROM likes WHERE sender_id = $4 AND receiver_id = $1) AS visitor_sent_like
      ON visitor_sent_like.receiver_id = users.id

      FULL OUTER JOIN 
        (SELECT * FROM blocks WHERE sender_id = $4 AND receiver_id = $1) AS visitor_sent_block
      ON visitor_sent_block.receiver_id = users.id

      FULL OUTER JOIN 
        (SELECT * FROM likes WHERE sender_id = $1 AND receiver_id = $4) AS visitor_received_like
      ON visitor_received_like.sender_id = users.id

      FULL OUTER JOIN
        (SELECT * FROM blocks WHERE sender_id = $1 AND receiver_id = $4) AS visitor_received_block
      ON visitor_received_block.sender_id = users.id
      
      FULL OUTER JOIN (
        SELECT user_id,
        ARRAY_TO_STRING(ARRAY_AGG(path), ',') AS list_images
        FROM images
        WHERE is_profile = FALSE
        GROUP BY user_id) AS images_not_profile
      ON images_not_profile.user_id = users.id
      
      INNER JOIN (SELECT * FROM images WHERE is_profile = TRUE) as image_profile
      ON image_profile.user_id = users.id
      WHERE users.id = $1`, [visitedId, visitor.latitude, visitor.longitude, visitor.id]);
    return (profile);
  }

  static async getUserCompleteInfo(userId) {
    const user = await PostgresService.pool.query(`
    SELECT 
        users.id,
        locations.latitude,
        locations.longitude,
        users_interests.nb_interests AS nb_interests,
        EXTRACT (YEAR FROM AGE(users.birthdate)) AS age,
        users.sexual_preference,
        users.gender

      FROM users
      
      INNER JOIN locations
      ON users.id = locations.user_id
      
      INNER JOIN (
        SELECT
          user_id,
          COUNT (*) AS nb_interests 
          FROM users_interests
          GROUP BY user_id
          ) AS users_interests
      ON users.id = users_interests.user_id
      
      INNER JOIN (
        SELECT 
          user_id,
          ARRAY_TO_STRING(ARRAY_AGG(path), ',') AS list_images
        FROM images
        GROUP BY user_id ) as images
      ON users.id = images.user_id
      WHERE users.id = $1`, [userId]);
    return (user);
  }

  static async getSuggestionList(user) {
    const suggestionList = await PostgresService.pool.query(`
      SELECT * FROM (
        SELECT
      users.first_name,
      EXTRACT (YEAR FROM AGE(users.birthdate)) AS age,
      CASE WHEN visitor_received_like.sender_id IS NULL THEN FALSE ELSE TRUE END as visited_liked_visitor,
      CASE WHEN visitor_received_block.sender_id IS NULL THEN FALSE ELSE TRUE END as visited_blocked_visitor,
      CASE WHEN visitor_sent_like.sender_id IS NULL THEN FALSE ELSE TRUE END as visitor_liked_visited,
      CASE WHEN visitor_sent_block.sender_id IS NULL THEN FALSE ELSE TRUE END as visitor_blocked_visited,
      interests.user_id,
      interests.common_interests,
      interests.list_interests,
      interests_2.list_all_interests,
      locations.distance,
      images_not_profile.list_images,
      image_profile.path,
      users.description,
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

    FULL OUTER JOIN (
      SELECT user_id,
      ARRAY_TO_STRING(ARRAY_AGG(path), ',') AS list_images
      FROM images
      WHERE is_profile = FALSE
      GROUP BY user_id) AS images_not_profile
    ON images_not_profile.user_id = users.id
    
    INNER JOIN (SELECT * FROM images WHERE is_profile = TRUE) as image_profile
    ON image_profile.user_id = users.id

    INNER JOIN
      
      (SELECT
        user_id,
        COUNT (*) AS common_interests,
        ARRAY_TO_STRING(ARRAY_AGG(interests.name), ',') AS list_interests
      FROM
        (SELECT * FROM users_interests WHERE user_id != $1) AS test1

      INNER JOIN
        (SELECT interest_id FROM users_interests WHERE user_id = $1) AS test2
      ON test1.interest_id = test2.interest_id

      INNER JOIN interests ON test2.interest_id = interests.id
 
      GROUP BY user_id) AS interests

    ON users.id = interests.user_id

    INNER JOIN

      (SELECT 
        user_id,
        ARRAY_TO_STRING(ARRAY_AGG(name), ',') AS list_all_interests
          FROM
            (SELECT * FROM
              (SELECT interest_id, user_id FROM users_interests WHERE user_id != $1) AS others_interests
    
            FULL OUTER JOIN
              (SELECT interest_id as my_interest, user_id as my_user_id FROM users_interests WHERE user_id = $1) AS my_interests
            ON my_interests.my_interest = others_interests.interest_id
            WHERE my_user_id IS NULL) AS other_interests
    
          INNER JOIN interests ON other_interests.interest_id = interests.id
          GROUP BY other_interests.user_id) AS interests_2

    ON interests_2.user_id = users.id

    FULL OUTER JOIN 
        (SELECT * FROM likes WHERE sender_id = $1) AS visitor_sent_like
      ON visitor_sent_like.receiver_id = users.id

    FULL OUTER JOIN 
        (SELECT * FROM blocks WHERE sender_id = $1) AS visitor_sent_block
      ON visitor_sent_block.receiver_id = users.id

    FULL OUTER JOIN 
        (SELECT * FROM likes WHERE receiver_id = $1) AS visitor_received_like
      ON visitor_received_like.sender_id = users.id

    FULL OUTER JOIN
        (SELECT * FROM blocks WHERE receiver_id = $1) AS visitor_received_block
      ON visitor_received_block.sender_id = users.id

    WHERE locations.distance < 20
    AND $6 & users.gender != 0
    AND $7 & users.sexual_preference != 0 ) AS list
    WHERE visitor_liked_visited = false
    AND visited_liked_visitor = false
    AND visitor_blocked_visited = false
    AND visited_blocked_visitor = false
    ORDER BY score DESC`, [user.id, user.latitude, user.longitude, user.nb_interests, user.age, user.sexual_preference, user.gender]);
    console.log(suggestionList.rows);
    return (suggestionList);
  }
}
