import PostgresService from '../services/postgres';

export default class Location {
  static async create(userId, name, latitude, longitude, isActive, { inTransaction }) {
    const location = await PostgresService.query(
      'INSERT INTO locations (user_id, name, latitude, longitude, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [
        userId,
        name,
        latitude,
        longitude,
        isActive,
      ],
      inTransaction,
    );
    return (location.rows[0]);
  }

  static async replace(userId, locationsParams, { inTransaction }) {
    const locationsToCreate = (locationsParams instanceof Array)
      ? locationsParams
      : [locationsParams];

    // Delete all locations for a given user
    await PostgresService.query(
      'DELETE FROM locations WHERE user_id = $1',
      [userId],
      inTransaction,
    );

    // Create locations
    const queryText = `
    INSERT INTO locations (user_id, latitude, longitude, is_active, name) VALUES
    ${locationsToCreate.map((location, index) => `($1, $${index * 4 + 2}, $${index * 4 + 3}, $${index * 4 + 4}, $${index * 4 + 5})`)}
    RETURNING *
    `;

    const params = [userId]
      .concat(locationsToCreate.reduce(
        (acc, curr) => acc.concat([curr.latitude, curr.longitude, curr.isActive, curr.name]),
        [],
      ));

    const locations = await PostgresService.query(
      queryText,
      params,
      inTransaction,
    );

    return locations.rows;
  }
}
