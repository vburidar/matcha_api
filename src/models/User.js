
import PostgresService from '../services/postgres';

export default class User {
  static async create(login, hashedPassword, salt, email) {
    const user = await PostgresService.pool.query(
      'INSERT INTO users (login, hashpwd, salt, email) VALUES ($1, $2, $3, $4) RETURNING id, login, email',
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
      SET hashpwd = $1,
      salt = $2
      WHERE login = $3
      RETURNING id, login, email`,
      [newPwdData[0], newPwdData[1], login],
    );
    return (update);
  }
}
