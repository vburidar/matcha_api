import fs from 'fs';
import { Client } from 'pg';
import crypto, { createPublicKey } from 'crypto';
import config from '../config';
import {
  names, surnamesWoman, surnamesMan, interests, locations,
} from '../../populate_data/populate';


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

  static async populateDatabase() {
    function randomDate(dateStart, dateEnd) {
      function randomValueBetween(min, max) {
        return Math.random() * (max - min) + min;
      }
      let date1 = dateStart || '01-01-1970';
      let date2 = dateEnd || new Date().toLocaleDateString();
      date1 = new Date(date1).getTime();
      date2 = new Date(date2).getTime();
      if (date1 > date2) {
        return new Date(randomValueBetween(date2, date1)).toLocaleDateString();
      }
      return new Date(randomValueBetween(date1, date2)).toLocaleDateString();
    }
    function hashPwd(rawPwd) {
      const salt = crypto.randomBytes(Math.ceil(8)).toString('hex').slice(0, 16);
      const hashedPwd = crypto.createHash('whirlpool').update(rawPwd + salt).digest('hex');
      return ([hashedPwd, salt]);
    }
    async function userExists(surname, name) {
      const user = await client.query('SELECT login FROM users WHERE surname=$1 AND name=$2', [surname, name]);
      if (user.rows[0]) {
        return (true);
      }
      return (false);
    }

    async function getUserId(surname, name) {
      const resp = await client.query('SELECT id FROM users WHERE surname=$1 AND name=$2', [surname, name]);
      return (resp.rows[0].id);
    }

    async function createInterests(userId) {
      const resp = await client.query('SELECT id FROM interests');
      const nbInsert = 3 + Math.floor(Math.random() * 5);
      let compteur = 0;
      while (compteur < nbInsert) {
        const id = Math.floor(Math.random() * resp.rows.length);
        client.query('INSERT INTO users_interests (id_users, id_interests) VALUES ($1, $2)', [userId, resp.rows[id].id]);
        compteur += 1;
      }
    }

    async function createPic(userId) {
      const imageId = Math.floor(Math.random() * 1000) + 1;
      const path = `https://i.picsum.photos/id/${imageId}/500/500.jpg`;
      const resp = await client.query('INSERT INTO images (path) VALUES ($1) RETURNING id', [path]);
      client.query('INSERT INTO users_images (id_users, id_images, is_profile) VALUES ($1, $2, $3)', [userId, resp.rows[0].id, true]);
    }
    function getLocation() {
      const randomPopulation = Math.random();
      const randomLatitude = Math.random();
      const randomLongitude = Math.random();
      const matchingCity = locations.filter((location) => location.population > randomPopulation)[0];
      const latitude = matchingCity.center.latitude + (randomLatitude * 2 - 1) * (matchingCity.radius / 111.12);
      const longitude = matchingCity.center.longitude + (randomLongitude * 2 - 1) * (matchingCity.radius / 111.12);
      return { latitude, longitude };
    }

    function createLocation(userId) {
      const location = getLocation();
      client.query(`INSERT INTO localisations 
      (id_users, latitude, longitude, is_active, name) 
      VALUES ($1, $2, $3, $4, $5)`, [userId, location.latitude, location.longitude, true, 'home']);
    }

    async function getSuggestionList(userId) {
      const resp = await client.query(`SELECT * 
      FROM interests 
      INNER JOIN users_interests 
      ON interests.id = users_interests.id_interests
      WHERE users_interests.id_users = $1`, [userId]);
      console.log('resp = ', resp);
      Object.keys(resp.rows).forEach(async (key) => {
        const respFindCommonInterests = await client.query(`SELECT id_users
        FROM users_interests
        WHERE id_interests = $1
        AND id_users != $2`, [resp.rows[key].id, userId]);
        console.log('Common Interests', respFindCommonInterests);
      });
    }

    async function getAllUsersId() {
      const resp = await client.query('SELECT id FROM users');
      console.log('resp=', resp);
      return (resp.rows);
    }

    async function createUser() {
      let tmpName = 'empty';
      let tmpSurname = '';
      let tmpBirthdate = '';
      let pwdData = [];
      let genreId = 0;
      let test = false;
      const tabGenre = ['man', 'woman']; pwdData = hashPwd('Qwerty123');
      tmpBirthdate = randomDate('01/01/1988', '01/01/1998');
      genreId = Math.floor(Math.random() * 2);
      while (tmpName === 'empty' || test === false) {
        test = true;
        tmpName = names[Math.floor(Math.random() * names.length)];
        if (genreId === 1) {
          tmpSurname = surnamesWoman[Math.floor(Math.random() * surnamesWoman.length)];
        } else {
          tmpSurname = surnamesMan[Math.floor(Math.random() * surnamesMan.length)];
        }
      }
      try {
        await client.query(`INSERT INTO 
      users 
      (login, hashPwd, salt, email, surname, name, genre, birthdate, validated, description, sexual_preference) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [`${tmpSurname}_${tmpName}`, pwdData[0], pwdData[1], `${tmpSurname}_${tmpName}@yopmail.com`, tmpSurname, tmpName, tabGenre[genreId], tmpBirthdate, true, 'beep bop I\'m a bot', 1 + Math.floor(Math.random() * 3)]);
        const userId = await getUserId(tmpSurname, tmpName);
        await createInterests(userId);
        await createLocation(userId);
        await createPic(userId, genreId);
      } catch (err) {
        test = false;
      }
    }

    let compteur = 0;
    Object.keys(interests).forEach((key) => {
      client.query('INSERT INTO interests (name) VALUES ($1)', [interests[key]]);
    });
    async function toto() {
      while (compteur < 10) {
        createUser(compteur);
        compteur += 1;
      }
    }
    await toto();
    compteur = 0;
    const userId = await getAllUsersId();
    console.log('here', userId);
    while (compteur < userId.length) {
      getSuggestionList(userId[compteur].id);
      compteur += 1;
    }
  }
}
