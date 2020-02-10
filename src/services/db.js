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
        await client.query('INSERT INTO users_interests (id_users, id_interests) VALUES ($1, $2)', [userId, resp.rows[id].id]);
        compteur += 1;
      }
    }

    async function createPic(userId) {
      const imageId = Math.floor(Math.random() * 1000) + 1;
      const path = `https://i.picsum.photos/id/${imageId}/500/500.jpg`;
      const resp = await client.query('INSERT INTO images (path) VALUES ($1) RETURNING id', [path]);
      await client.query('INSERT INTO users_images (id_users, id_images, is_profile) VALUES ($1, $2, $3)', [userId, resp.rows[0].id, true]);
    }
    async function getLocation() {
      const randomPopulation = Math.random();
      const randomLatitude = Math.random();
      const randomLongitude = Math.random();
      const matchingCity = locations.filter((location) => location.population > randomPopulation)[0];
      const latitude = matchingCity.center.latitude + (randomLatitude * 2 - 1) * (matchingCity.radius / 111.12);
      const longitude = matchingCity.center.longitude + (randomLongitude * 2 - 1) * (matchingCity.radius / 111.12);
      return { latitude, longitude, name: matchingCity.name };
    }

    async function createLocation(userId) {
      const location = await getLocation();
      await client.query(`INSERT INTO localisations 
      (id_users, latitude, longitude, is_active, name) 
      VALUES ($1, $2, $3, $4, $5)`, [userId, location.latitude, location.longitude, true, location.name]);
    }

    async function multifactorMatching(userId, userLat, userLong, nbInterests, userAge, userPref, userGenre) {
      const suggestionList = await client.query(`SELECT interests.id_users, 
      interests.common_interests, 
      localisations.distance,
      users.genre AS genreReceiver,
      users.sexual_preference::bit(4) AS prefReceiver,
      $7 as GenreSender,
      $6::int as prefSender,
      abs($5 - EXTRACT (YEAR FROM AGE(users.birthdate))) as age_difference,
      log(1 + 1.7 * (common_interests::float / $4)) AS score_interest,
      1 / (exp(abs($5 - EXTRACT (YEAR FROM AGE(users.birthdate)))/10)) as score_age,
      1 / (exp(distance / 10)) AS score_distance,
      log(1 + 1.7 * (common_interests::float / $4)) + 1 / (exp(abs($5 - EXTRACT (YEAR FROM AGE(users.birthdate)))/10)) + 1 / (exp(distance / 10)) AS score
      FROM users
      INNER JOIN
      (SELECT id_users, 
        111 * |/((latitude - $2)^2+ (longitude - $3)^2) AS distance 
        FROM localisations) AS localisations
        ON localisations.id_users = users.id
      INNER JOIN 
      (SELECT id_users, COUNT (*) AS common_interests
      FROM (
        SELECT  * 
        FROM users_interests
        WHERE id_users != $1) AS test1
      INNER JOIN
      (SELECT 
      id_interests 
      FROM users_interests 
      WHERE id_users = $1) AS test2
      ON test1.id_interests = test2.id_interests
      GROUP BY id_users) AS interests
      ON localisations.id_users = interests.id_users
      WHERE localisations.distance < 20
      AND(
        (users.genre = 'man' AND $6 & 1 = 1
        OR users.genre = 'woman' AND $6 & 2 = 2)
        AND 
        ($7 = 'man' AND users.sexual_preference & 1 = 1
        OR $7 = 'woman' AND users.sexual_preference & 2 = 2)
      )
      ORDER BY score DESC`, [userId, userLat, userLong, nbInterests, userAge, userPref, userGenre]);
      console.log(suggestionList.rows);
      return (suggestionList);
    }

    async function generateLikes(list, userId) {
      const arr = [];
      const nbLikeSent = Math.ceil(list.rows.length / 10);
      //console.log('user', userId, 'sent', nbLikeSent, 'likes on', list.rows.length, 'suggestions');
      while (arr.length < nbLikeSent) {
        const r = Math.floor(Math.random() * list.rows.length);
        if (arr.indexOf(r) === -1) arr.push(r);
      }
      let compteur = 0;
      while (compteur < arr.length) {
        await client.query('INSERT INTO likes (id_sender, id_receiver) VALUES ($1, $2)', [userId, list.rows[arr[compteur]].id_users]);
        compteur += 1;
      }
    }

    async function getSuggestionList(userId) {
      const ownLoc = await client.query('SELECT * FROM localisations WHERE id_users = $1', [userId]);
      const interest = await client.query('SELECT * FROM users_interests WHERE id_users = $1', [userId]);
      const age = await client.query('SELECT EXTRACT (YEAR FROM AGE(birthdate)) AS age FROM users WHERE id = $1', [userId]);
      const pref = await client.query('SELECT sexual_preference, genre FROM users WHERE id = $1', [userId]);
      const list = await multifactorMatching(userId, ownLoc.rows[0].latitude, ownLoc.rows[0].longitude, interest.rows.length, age.rows[0].age, pref.rows[0].sexual_preference, pref.rows[0].genre);
      generateLikes(list, userId);
    }

    async function getAllUsersId() {
      const resp = await client.query('SELECT id FROM users');
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
    Object.keys(interests).forEach(async (key) => {
      await client.query('INSERT INTO interests (name) VALUES ($1)', [interests[key]]);
    });
    while (compteur < 100) {
      await createUser(compteur);
      compteur += 1;
    }
    compteur = 0;
    const userId = await getAllUsersId();
    while (compteur < userId.length) {
      getSuggestionList(userId[compteur].id);
      compteur += 1;
    }
  }
}
