import PostgresService from '../services/postgres';

export default class Interest {
  static async get(names, { inTransaction }) {
    if (names instanceof Array) {
      const queryText = `SELECT * FROM interests WHERE name IN (${names.map((interestData, index) => `$${index + 1}`)})`;

      const locations = await PostgresService.query(
        queryText,
        names,
        inTransaction,
      );
      return locations.rows;
    }
    return null;
  }

  static async create(namesParams, { inTransaction }) {
    const names = (typeof namesParams === 'string') ? [namesParams] : namesParams;

    let queryText = `
    WITH
      existingones AS (
          SELECT *
          FROM interests
          WHERE name IN (${names.map((name, index) => `$${index + 1}`)})
      ),
    `;

    names.forEach((name, index) => {
      queryText += `
      new${index + 1} AS (
        INSERT INTO interests (name)
          SELECT $${index + 1}
          WHERE NOT EXISTS (
              SELECT *
              FROM interests
              WHERE name = $${index + 1}
          )
          RETURNING *
      )${index + 1 < names.length ? ',' : ''}
      `;
    });

    queryText += 'SELECT * FROM existingones UNION ';

    names.forEach((name, index) => {
      queryText += `SELECT * FROM new${index + 1} ${index + 1 < names.length ? 'UNION ' : ''}`;
    });

    const interests = await PostgresService.query(
      queryText,
      names,
      inTransaction,
    );

    return interests.rows;
  }
}
