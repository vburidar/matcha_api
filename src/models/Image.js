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

  static async update(userId, imagesParams, { inTransaction }) {
    const imagesToCreate = (imagesParams instanceof Array) ? imagesParams : [imagesParams];

    const deleteQueryText = `
    DELETE FROM images
    WHERE user_id = $1 AND path NOT IN (
      ${imagesToCreate.map((image, index) => `$${index + 2}`)}
    ) RETURNING *
    `;

    const deletedImages = await PostgresService.query(
      deleteQueryText,
      [
        userId,
        ...imagesToCreate.map((image) => image.path),
      ],
      inTransaction,
    );

    let queryText = 'WITH ';

    /** Update part */
    imagesToCreate.forEach((image, index) => {
      queryText += `
      update${index + 1} AS (
        UPDATE images SET is_profile = $${index * 2 + 3}
        WHERE user_id = $1 AND path = $${index * 2 + 2}
        RETURNING *
      ),
      `;
    });

    /** Create part */
    imagesToCreate.forEach((image, index) => {
      queryText += `
      new${index + 1} AS (
        INSERT INTO images (user_id, path, is_profile)
        SELECT $1, $${index * 2 + 2}, $${index * 2 + 3}
        WHERE NOT EXISTS (
          SELECT * FROM images WHERE user_id = $1 AND path = $${index * 2 + 2}
        )
        RETURNING *
        )${index + 1 < imagesToCreate.length ? ',' : ''}
      `;
    });

    imagesToCreate.forEach((image, index) => {
      queryText += `
      SELECT * FROM update${index + 1}
      UNION
      SELECT * FROM new${index + 1}
      ${index + 1 < imagesToCreate.length ? 'UNION ' : ''}
      `;
    });

    const images = await PostgresService.query(
      queryText,
      [
        userId,
        ...imagesToCreate.reduce((acc, image) => acc.concat(image.path, image.isProfile), []),
      ],
      inTransaction,
    );

    return {
      images: images.rows,
      deletedImages: deletedImages.rows,
    };
  }
}
