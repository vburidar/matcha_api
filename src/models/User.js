
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
}
