
import PostgresService from '../services/postgres';

export default class User {
  static async create(login, firstName, lastName, hashedPassword, salt, email) {
    const user = await PostgresService.pool.query(
      `INSERT INTO users (login, first_name, last_name, password, salt, email) 
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, login, email`,
      [
        login,
        firstName,
        lastName,
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
      deletedones AS (
        DELETE FROM users_interests
        WHERE user_id = $1 AND interest_id IN
        (
            SELECT interest_id
            FROM users_interests
            INNER JOIN interests ON users_interests.interest_id = interests.id
            WHERE users_interests.user_id = $1 AND interest_id NOT IN (${interests.map((interest, index) => `$${index + 2}`)})
        )
        RETURNING *
      ),
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

  static async getCompletePrivateProfile(userId, { inTransaction = false } = {}) {
    const queryText = `
    SELECT
      users.id,
      users.login,
      users.email,
      users.first_name AS "firstName",
      users.last_name AS "lastName",
      users.birthdate,
      users.gender,
      users.sexual_preference AS "sexualPreference",
      users.description,
      users.popularity_score AS "popularityScore",

      CASE WHEN locs.locations IS NULL THEN array_to_json('{}'::json[]) ELSE locs.locations END,
      CASE WHEN imgs.images IS NULL THEN array_to_json('{}'::json[]) ELSE imgs.images END,
      CASE WHEN ints.interests IS NULL THEN array_to_json('{}'::json[]) ELSE ints.interests END
    FROM users

    FULL OUTER JOIN (
      SELECT
        user_id,
        JSON_AGG(JSON_BUILD_OBJECT(
          'id', images.id,
          'isProfile', images.is_profile,
          'path', CASE
                    WHEN path NOT SIMILAR TO 'https*://_*' THEN concat('http://localhost:8080/pictures/', path)
                    ELSE path
                  END
        )) AS images
      FROM images
      GROUP BY images.user_id
    ) AS imgs
    ON users.id = imgs.user_id

    FULL OUTER JOIN (
      SELECT
        user_id,
        JSON_AGG(JSON_BUILD_OBJECT(
          'id', locations.id,
          'latitude', locations.latitude,
          'longitude', locations.longitude,
          'isActive', locations.is_active,
          'name', locations.name
        )) AS locations
      FROM locations
      GROUP BY locations.user_id
    ) AS locs
    ON users.id = locs.user_id

    FULL OUTER JOIN (
      SELECT
        user_id,
        JSON_AGG(JSON_BUILD_OBJECT(
          'id', interests.id,
          'name', interests.name
        )) AS interests
      FROM users_interests
      INNER JOIN interests ON users_interests.interest_id = interests.id
      GROUP BY user_id
    ) AS ints
    ON users.id = ints.user_id

    WHERE users.id = $1
    `;

    const user = await PostgresService.query(
      queryText,
      [userId],
      inTransaction,
    );

    return user.rows[0];
  }

  static async getProfileCompleteInfo(visitedId, visitor) {
    const profile = await PostgresService.pool.query(`
      WITH virtual_interest AS (
        SELECT COUNT(*) AS nb_common_interest FROM (SELECT * FROM  users_interests
        WHERE user_id = $4) AS int1

        INNER JOIN

        (SELECT * FROM users_interests
        WHERE user_id = $1) AS int2

        ON int1.interest_id = int2.interest_id
      )  

      SELECT 
        users.id,
        users.first_name,
        users.last_name,
        users.description,
        images_not_profile.list_images,
        CASE
          WHEN image_profile.path NOT SIMILAR TO 'https*://_*' THEN concat('http://localhost:8080/pictures/', image_profile.path)
          ELSE image_profile.path
        END,
        locations.latitude,
        locations.longitude,
        popularity_score,
        (SELECT nb_common_interest FROM virtual_interest) AS test,
        $6::int AS test2,
        LN(1 + (exp(1) - 1) * ((SELECT nb_common_interest::float FROM virtual_interest) / $6)) AS score_interest,
        CASE WHEN visitor_received_like.sender_id IS NULL THEN FALSE ELSE TRUE END as visited_liked_visitor,
        CASE WHEN visitor_received_block.sender_id IS NULL THEN FALSE ELSE TRUE END as visited_blocked_visitor,
        CASE WHEN visitor_sent_like.sender_id IS NULL THEN FALSE ELSE TRUE END as visitor_liked_visited,
        CASE WHEN visitor_sent_block.sender_id IS NULL THEN FALSE ELSE TRUE END as visitor_blocked_visited,
        111 * |/((latitude - $2)^2 + (longitude - $3)^2) AS distance,
        1 / (exp(abs($5 - EXTRACT (YEAR FROM AGE(users.birthdate)))/10)) as score_age,
        1 / (exp((111 * |/((latitude - $2)^2 + (longitude - $3)^2)) / 10)) AS score_distance,
        users_interests.nb_interests AS nb_interests,
        users_interests.list_interests,
        EXTRACT (YEAR FROM AGE(users.birthdate)) AS age,
        users.sexual_preference,
        users.gender,
        users.last_time_online

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
        ARRAY_TO_STRING(ARRAY_AGG(
          CASE
            WHEN path NOT SIMILAR TO 'https*://_*' THEN concat('http://localhost:8080/pictures/', path)
            ELSE path
          END
        ), ',') AS list_images
        FROM images
        WHERE is_profile = FALSE
        GROUP BY user_id) AS images_not_profile
      ON images_not_profile.user_id = users.id
      
      INNER JOIN (SELECT * FROM images WHERE is_profile = TRUE) as image_profile
      ON image_profile.user_id = users.id
      WHERE users.id = $1`, [visitedId, visitor.latitude, visitor.longitude, visitor.id, visitor.age,
      visitor.nb_interests]);
    return (profile);
  }

  static async getUserCompleteInfo(userId) {
    const user = await PostgresService.pool.query(`
    SELECT 
        users.id,
        locations.latitude,
        locations.longitude,
        popularity_score,
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
      CASE
        WHEN image_profile.path NOT SIMILAR TO 'https*://_*' THEN concat('http://localhost:8080/pictures/', image_profile.path)
        ELSE image_profile.path
      END,
      users.description,
      users.gender AS gender_receiver,
      users.sexual_preference::bit(4) AS pref_receiver,
      $7::int as gender_sender,
      $6::int as pref_sender,
      abs($5 - EXTRACT (YEAR FROM AGE(users.birthdate))) as age_difference,  
      LN(1 + (exp(1) - 1) * (common_interests::float / $4)) AS score_interest,
      1 / (exp(abs($5 - EXTRACT (YEAR FROM AGE(users.birthdate)))/10)) as score_age,
      1 / (exp(distance / 10)) AS score_distance,
      users.popularity_score::float / 100 as score_popularity,
      users.popularity_score::float / 100 + log(1 + 1.7 * (common_interests::float / $4)) + 1 / (exp(abs($5 - EXTRACT (YEAR FROM AGE(users.birthdate)))/10)) + 1 / (exp(distance / 10)) AS score
    FROM users
    
    INNER JOIN
      (SELECT
        user_id, 
        111 * |/((latitude - $2)^2 + (longitude - $3)^2) AS distance 
      FROM locations) AS locations
    ON locations.user_id = users.id

    FULL OUTER JOIN (
      SELECT user_id,
      ARRAY_TO_STRING(ARRAY_AGG(
        CASE
          WHEN path NOT SIMILAR TO 'https*://_*' THEN concat('http://localhost:8080/pictures/', path)
          ELSE path
        END
      ), ',') AS list_images
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
    return (suggestionList);
  }

  static async getUserWithLastMessage(userId, { inTransaction = false } = {}) {
      const queryText = `
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
),
all_ids AS
      (
        SELECT id, msg1.other_user
        FROM (
          SELECT
            MAX(created_at) AS created_at,
            CASE WHEN messages.sender_id != $1
              THEN sender_id
              ELSE receiver_id END
            AS other_user
          FROM messages
          WHERE messages.sender_id = $1 OR messages.receiver_id = $1
          GROUP BY other_user
        ) AS msg1
        INNER JOIN (
          SELECT
            id,
            content,
            created_at,
            CASE WHEN messages.sender_id != $1
              THEN sender_id
              ELSE receiver_id END
            AS other_user
          FROM messages
          WHERE messages.sender_id = $1 OR messages.receiver_id = $1
        ) AS msg2
        ON msg2.created_at = msg1.created_at AND msg1.other_user = msg2.other_user
      )
SELECT
    match.id,
    CASE
      WHEN images.path NOT SIMILAR TO 'https*://_*' THEN concat('http://localhost:8080/pictures/', images.path)
      ELSE images.path
    END AS "profilePicture",
    users.is_online AS "isOnline",
    JSON_BUILD_OBJECT(
      'id', messages.id,
      'senderId', messages.sender_id,
      'receiverId', messages.receiver_id,
      'content', messages.content,
      'createdAt', messages.created_at
    ) AS "lastMessage",
    users.first_name as "firstName"
FROM
    (SELECT receiver_id AS id FROM receivers
        INNER JOIN senders ON senders.sender_id = receivers.receiver_id) AS match
    INNER JOIN
    (SELECT
        id,
        is_online,
        first_name FROM users) AS users
    ON users.id = match.id
    INNER JOIN (SELECT * FROM images WHERE is_profile = TRUE) AS images ON users.id = images.user_id
    FULL OUTER JOIN all_ids ON all_ids.other_user = match.id
    FULL OUTER JOIN messages ON all_ids.id = messages.id
    WHERE match.id IS NOT NULL
      `;

      const users = await PostgresService.query(
        queryText,
        [userId],
        inTransaction,
      );
      return users.rows;
  }

  static async isComplete(userId) {
    const isComplete = await PostgresService.query(`
    SELECT birthdate from users
    WHERE id = $1`, [userId]);
    return (isComplete);
  }

  static async getMessages(userId, talkerId) {
    const messageList = await PostgresService.query(`
    SELECT * FROM messages WHERE sender_id = $1 AND receiver_id = $2
    UNION
    SELECT * FROM messages WHERE sender_id = $2 AND receiver_id = $1
    ORDER BY created_at ASC`, [userId, talkerId]);
    return (messageList);
  }

  static async addMessage(userId, receiverId, content) {
    const message = await PostgresService.query(`
    INSERT INTO messages (sender_id, receiver_id, content)
    VALUES ($1, $2, $3) RETURNING *`, [userId, receiverId, content]);
    return message.rows[0];
  }

  static async getUsersConnected() {
    const userIds = await PostgresService.query('SELECT ARRAY_AGG(id) AS ids FROM users WHERE is_online = true');
    return userIds.rows[0].ids;
  }

  static async getLocation(userId) {
    const location = await PostgresService.query(`
    SELECT
      latitude,
      longitude
    FROM users
    
    INNER JOIN locations
    ON users.id = locations.user_id
    WHERE locations.is_active = TRUE
    AND users.id = $1`, [userId]);
    return (location.rows[0]);
  }

  static async getCustomList(userId, location, data) {
    const tab = [
      location.latitude,
      location.longitude,
      parseInt(data.distance, 10),
      data.age[0],
      data.age[1],
      data.popularity[0],
      data.popularity[1],
      data.order,
      userId];
    let request = `
    WITH virtual_user AS (
      SELECT * FROM users WHERE id = $9
    )
    SELECT * FROM(
    SELECT
      users.first_name,
      users.id as user_id,
      users.popularity_score,
      users.description,
      users.gender,
      users.sexual_preference,
      locations.distance,
      interests.list_all_interests,
      interests_2.list_interests,
      CASE WHEN interests_2.common_interests IS NULL THEN 0 ELSE interests_2.common_interests END,
      images_not_profile.list_images,
      CASE
        WHEN image_profile.path NOT SIMILAR TO 'https*://_*' THEN concat('http://localhost:8080/pictures/', image_profile.path)
        ELSE image_profile.path
      END,
      EXTRACT (YEAR FROM AGE(users.birthdate)) AS age
    FROM users `;

    if (data.interest[0] !== 'any_interest') {
      data.interest.map((elem, idx) => {
        request += `INNER JOIN
      ((SELECT user_id, interest_id FROM users_interests) as users_int${idx}
        INNER JOIN (SELECT * FROM interests WHERE interests.name = $${idx + 10}) as int${idx}
        ON users_int${idx}.interest_id = int${idx}.id) AS interests${idx}
      ON users.id = interests${idx}.user_id `;
        tab.push(elem);
      });
    }

    request += `
    FULL OUTER JOIN
      
      (SELECT
        user_id,
        COUNT (*) AS common_interests,
        ARRAY_TO_STRING(ARRAY_AGG(interests.name), ',') AS list_interests
      FROM
        (SELECT * FROM users_interests WHERE user_id != $9) AS test1

      INNER JOIN
        (SELECT interest_id FROM users_interests WHERE user_id = $9) AS test2
      ON test1.interest_id = test2.interest_id

      INNER JOIN interests ON test2.interest_id = interests.id
 
      GROUP BY user_id) AS interests_2

    ON users.id = interests_2.user_id

    INNER JOIN

    (SELECT 
      user_id,
      ARRAY_TO_STRING(ARRAY_AGG(name), ',') AS list_all_interests
        FROM
          (SELECT * FROM
            (SELECT interest_id, user_id FROM users_interests WHERE user_id != $9) AS others_interests
  
          FULL OUTER JOIN
            (SELECT interest_id as my_interest, user_id as my_user_id FROM users_interests WHERE user_id = $9) AS my_interests
          ON my_interests.my_interest = others_interests.interest_id
          WHERE my_user_id IS NULL) AS other_interests
  
        INNER JOIN interests ON other_interests.interest_id = interests.id
        GROUP BY other_interests.user_id) AS interests

  ON interests.user_id = users.id


    FULL OUTER JOIN (
      SELECT user_id,
      ARRAY_TO_STRING(ARRAY_AGG(
        CASE
          WHEN path NOT SIMILAR TO 'https*://_*' THEN concat('http://localhost:8080/pictures/', path)
          ELSE path
        END
      ), ',') AS list_images
      FROM images
      WHERE is_profile = FALSE
      GROUP BY user_id) AS images_not_profile
    ON images_not_profile.user_id = users.id
    
    INNER JOIN (SELECT * FROM images WHERE is_profile = TRUE) as image_profile
    ON image_profile.user_id = users.id
  
  INNER JOIN
    (SELECT 
      user_id,
      111 * |/((latitude - $1)^2 + (longitude - $2)^2) as distance
    FROM locations
    WHERE 111 * |/((latitude - $1)^2 + (longitude - $2)^2) < $3) AS locations
  ON users.id = locations.user_id) AS profile
  WHERE profile.age >= $4 AND profile.age <= $5
  AND profile.popularity_score >= $6 AND profile.popularity_score <= $7
  AND profile.user_id != $9
  ORDER BY
    CASE WHEN $8 = 'distance' THEN distance END ASC,
    CASE WHEN $8 = 'ageasc' THEN age END ASC,
    CASE WHEN $8 = 'agedesc' THEN age END DESC,
    CASE WHEN $8 = 'popularity' THEN popularity_score END DESC,
    CASE WHEN $8 = 'commoninterests' THEN common_interests END DESC
  LIMIT 100  `;
    const list = await PostgresService.query(request, tab);
    return (list.rows);
  }
}
