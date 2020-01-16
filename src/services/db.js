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

export default class DbService {
  static resetDatabase() {
    console.log('DROPPING DATABASE');
    client.query('DROP TABLE IF EXISTS sessions');
    client.query('DROP TABLE IF EXISTS users_interests');
    client.query('DROP TABLE IF EXISTS users_images');
    client.query('DROP TABLE IF EXISTS localisations');
    client.query('DROP TABLE IF EXISTS notifications');
    client.query('DROP TABLE IF EXISTS messages');
    client.query('DROP TABLE IF EXISTS likes');
    client.query('DROP TABLE IF EXISTS flags');
    client.query('DROP TABLE IF EXISTS blocks');
    client.query('DROP TABLE IF EXISTS users');
    client.query('DROP TABLE IF EXISTS interests');
    client.query('DROP TABLE IF EXISTS images');
    client.query('DROP TYPE IF EXISTS genre');
    client.query('DROP TYPE IF EXISTS type_notif');
    console.log('DROPPING DONE');
  }

  static setupDatabase() {
    console.log('SETUP OF A CLEAN DATABASE');
    this.resetDatabase();
    console.log('CREATING TYPES AND TABLES');
    client.query('CREATE TYPE genre AS ENUM (\'man\', \'woman\', \'transman\', \'transwoman\', \'genderfluid\', \'ungendered\')');
    client.query('CREATE TYPE type_notif AS ENUM(\'message\', \'like\', \'unlike\', \'visit\', \'match\')');
    client.query(`CREATE TABLE images (
      id serial PRIMARY KEY NOT NULL,
      path varchar(256))`);
    client.query(`CREATE TABLE users (
        id serial PRIMARY KEY NOT NULL,
        login varchar(64) UNIQUE NOT NULL,
        hashPwd varchar(128) NOT NULL,
        salt varchar(16) NOT NULL,
        email varchar(128) UNIQUE NOT NULL,
        surname varchar(64),
        name varchar(64),
        birthdate date,
        validated boolean,
        genre genre,
        sexual_preference int,
        description varchar(1024),
        popularity_score int,
        last_time_online timestamp,
        is_online boolean)`);
    client.query(`CREATE TABLE interests(
      id serial PRIMARY KEY NOT NULL,
      name varchar(64))`);

    client.query(`CREATE TABLE blocks (
      id_sender integer REFERENCES users(id),
      id_receiver integer REFERENCES users(id))`);
    client.query(`CREATE TABLE flags (
      id_sender integer REFERENCES users(id),
      id_receiver integer REFERENCES users(id))`);
    client.query(`CREATE TABLE likes(
      id_receiver integer REFERENCES users(id),
      id_sender integer REFERENCES users(id))`);
    client.query(`CREATE TABLE messages (
      id serial PRIMARY KEY NOT NULL,
      id_sender integer REFERENCES users(id),
      id_receiver integer REFERENCES users(id),
      date timestamp,
      content_text varchar(2048))`);
    client.query(`CREATE TABLE localisations(
      id serial PRIMARY KEY NOT NULL,
      id_users integer REFERENCES users(id),
      latitude real,
      longitude real,
      is_active boolean,
      name varchar(64))`);
    client.query(`CREATE TABLE users_images(
      id_users integer REFERENCES users(id),
      id_images integer REFERENCES images(id),
      is_profile boolean)`);
    client.query(`CREATE TABLE users_interests (
      id_users integer REFERENCES users(id),
      id_interests integer REFERENCES interests(id))`);
    client.query(`CREATE TABLE notifications (
      id serial PRIMARY KEY NOT NULL,
      type type_notif,
      id_event integer)`);
    client.query(`CREATE TABLE "sessions" (
      "sid" varchar NOT NULL COLLATE "default",
      "sess" json NOT NULL,
      "expire" timestamp(6) NOT NULL
    )
      WITH (OIDS=FALSE);
      
      ALTER TABLE "sessions" ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
      
      CREATE INDEX "IDX_sessions_expire" ON "sessions" ("expire")`);
    console.log('SETUP DONE');
  }
}
