import pg from 'pg';

const {Client} = pg;

const client = new Client({
  // user: process.env.DB_USERNAME,
  // host: process.env.DB_HOST,
  // database: process.env.DB_DATABASE,
  // password: process.env.DB_PASSWORD,
  // port: process.env.DB_PORT,

  user: 'vburidar',
  host: 'localhost',
  database: 'matcha',
  password: '',
  port: 5432,
});

client.connect();

function reset_database(req, res) {
  console.log('DROPPING THE COMPLETE DATABASE');
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
  res.send('DROPPING DONE');
}

function setup_database(req, res) {
  console.log('SETUP OF A CLEAN DATABASE');
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
  client.query('CREATE TYPE genre AS ENUM (\'man\', \'woman\', \'transman\', \'transwoman\', \'genderfluid\', \'ungendered\')');
  client.query('CREATE TYPE type_notif AS ENUM(\'message\', \'like\', \'unlike\', \'visit\', \'match\')');
  client.query(`CREATE TABLE images (
    id serial PRIMARY KEY NOT NULL,
    path varchar(256))`);
  client.query(`CREATE TABLE users (
      id serial PRIMARY KEY NOT NULL,
      login varchar(64) UNIQUE NOT NULL,
      hash_pwd varchar(128) NOT NULL,
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
  res.send('SETUP DONE');
}

export default {
  reset_database,
  setup_database,
};