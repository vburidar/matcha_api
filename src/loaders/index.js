import postgresLoader from './postgres';
import expressLoader from './express';

export default async (app) => {
  const pgPool = postgresLoader();
  console.log('postgres connected');
  await expressLoader({ app, pgPool });
};
