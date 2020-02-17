
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
}
