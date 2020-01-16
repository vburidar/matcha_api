
import { Client } from 'pg';
import config from '../config';

const client = new Client({
  user: config.postgres.user,
  host: config.postgres.host,
  database: config.postgres.database,
  password: config.postgres.password,
  port: config.postgres.port,
});
client.connect();

export default class User {
  static async create(login, hashedPassword, salt, email) {
    const user = await client.query(
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
    const user = await client.query(
      `SELECT
        *
      FROM users
      WHERE
        login=$1`,
      [login],
    );
    return (user.rows[0]);
  }
}
