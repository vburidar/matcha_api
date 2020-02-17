import PostgresService from '../services/postgres';

export default class Image {
  static async create(userId, path, isProfile, { inTransaction }) {
    const location = await PostgresService.query(
      'INSERT INTO images (user_id, path, is_profile) VALUES ($1, $2, $3) RETURNING *',
      [
        userId,
        path,
        isProfile,
      ],
      inTransaction,
    );

    return location.rows[0];
  }
}
