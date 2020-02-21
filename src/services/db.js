import fs from 'fs';
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
    client.query('DROP TABLE IF EXISTS locations');
    client.query('DROP TABLE IF EXISTS notifications');
    client.query('DROP TABLE IF EXISTS messages');
    client.query('DROP TABLE IF EXISTS likes');
    client.query('DROP TABLE IF EXISTS visits');
    client.query('DROP TABLE IF EXISTS reports');
    client.query('DROP TABLE IF EXISTS blocks');
    client.query('DROP TABLE IF EXISTS images');
    client.query('DROP TABLE IF EXISTS users');
    client.query('DROP TABLE IF EXISTS interests');
    client.query('DROP TYPE IF EXISTS notification');
    client.query('DROP TYPE IF EXISTS report');
    console.log('DROPPING DONE');
  }

  static setupDatabase() {
    console.log('SETUP OF A CLEAN DATABASE');
    this.resetDatabase();
    console.log('CREATING TYPES AND TABLES');
    client.query('CREATE TYPE notification AS ENUM(\'message\', \'like\', \'unlike\', \'visit\', \'match\')');
    client.query('CREATE TYPE report AS ENUM(\'fraud\', \'harassment\', \'identity_theft\')');
    client.query(`CREATE TABLE users (
      id serial PRIMARY KEY NOT NULL,
      login varchar(64) UNIQUE NOT NULL,
      password varchar(128) NOT NULL,
      salt varchar(16) NOT NULL,
      email varchar(128) UNIQUE NOT NULL,
      first_name varchar(64),
      last_name varchar(64),
      birthdate date,
      validated boolean NOT NULL DEFAULT FALSE,
      gender int,
      sexual_preference int,
      description varchar(1024),
      popularity_score int,
      last_time_online timestamp,
      is_online boolean)`);
    client.query(`CREATE TABLE images (
      id serial PRIMARY KEY NOT NULL,
      user_id integer REFERENCES users(id) NOT NULL,
      is_profile boolean NOT NULL,
      path varchar(256) NOT NULL)`);
    client.query(`CREATE UNIQUE INDEX test 
    ON images (user_id) WHERE is_profile = 'true';`);
    client.query(`CREATE TABLE interests(
      id serial PRIMARY KEY NOT NULL,
      name varchar(64) UNIQUE NOT NULL)`);
    client.query(`CREATE TABLE blocks (
      sender_id integer REFERENCES users(id),
      receiver_id integer REFERENCES users(id),
      PRIMARY KEY (sender_id, receiver_id))`);
    client.query(`CREATE TABLE reports (
      sender_id integer REFERENCES users(id),
      receiver_id integer REFERENCES users(id),
      type report NOT NULL,
      PRIMARY KEY (sender_id, receiver_id))`);
    client.query(`CREATE TABLE likes(
      receiver_id integer REFERENCES users(id),
      sender_id integer REFERENCES users(id),
      created_at timestamptz NOT NULL default NOW(),
      PRIMARY KEY (sender_id, receiver_id))`);
    client.query(`CREATE TABLE messages (
      id serial PRIMARY KEY NOT NULL,
      sender_id integer REFERENCES users(id) NOT NULL,
      receiver_id integer REFERENCES users(id) NOT NULL,
      created_at timestamptz NOT NULL default NOW(),
      content text)`);
    client.query(`CREATE TABLE locations(
      id serial PRIMARY KEY NOT NULL,
      user_id integer REFERENCES users(id) NOT NULL,
      latitude numeric(6, 4) NOT NULL,
      longitude numeric(7, 4) NOT NULL,
      is_active boolean NOT NULL,
      name varchar(64) NOT NULL)`);
    client.query(`CREATE TABLE users_interests (
      user_id integer REFERENCES users(id),
      interest_id integer REFERENCES interests(id),
      PRIMARY KEY (user_id, interest_id))`);
    client.query(`CREATE TABLE notifications (
      id serial PRIMARY KEY NOT NULL,
      type notification NOT NULL,
      event_id integer NOT NULL)`);
    client.query(`CREATE TABLE visits (
      receiver_id integer REFERENCES users(id),
      sender_id integer REFERENCES users(id),
      created_at timestamptz NOT NULL default NOW(),
      PRIMARY KEY (sender_id, receiver_id, created_at))`);
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
