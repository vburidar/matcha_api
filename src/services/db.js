import { Client } from 'pg';
import crypto from 'crypto'
import config from '../config';
import {names} from '../../populate_data/populate';
import {surnamesWoman} from '../../populate_data/populate';
import {surnamesMan} from '../../populate_data/populate';

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

static randomDate(date1, date2){
    function randomValueBetween(min, max) {
      return Math.random() * (max - min) + min;
    }
    var date1 = date1 || '01-01-1970'
    var date2 = date2 || new Date().toLocaleDateString()
    date1 = new Date(date1).getTime()
    date2 = new Date(date2).getTime()
    if( date1>date2){
        return new Date(randomValueBetween(date2,date1)).toLocaleDateString()   
    } else{
        return new Date(randomValueBetween(date1, date2)).toLocaleDateString()  

    }
}


  static populateDatabase() {
   function randomDate(date1, date2){
      function randomValueBetween(min, max) {
        return Math.random() * (max - min) + min;
      }
      var date1 = date1 || '01-01-1970'
      var date2 = date2 || new Date().toLocaleDateString()
      date1 = new Date(date1).getTime()
      date2 = new Date(date2).getTime()
      if( date1>date2){
          return new Date(randomValueBetween(date2,date1)).toLocaleDateString()   
      } else{
          return new Date(randomValueBetween(date1, date2)).toLocaleDateString()  
  
      }
    }
    function hashPwd(rawPwd) {
      const salt = crypto.randomBytes(Math.ceil(8)).toString('hex').slice(0, 16);
      const hashedPwd = crypto.createHash('whirlpool').update(rawPwd + salt).digest('hex');
      return ([hashedPwd, salt]);
    }
    function userExists(surname, name){
      const user = client.query(`SELECT login FROM users WHERE surname = $1 AND name = $2`, [surname, name]);
      if (user.row !== undefined)
      {
        console.log("DOUBLON");
        return (1);
      }
      return (0);
    }
    console.log(surnamesMan);    
    let compteur = 0;
    let tmpName = 'empty';
    let tmpSurname = '';
    let tmpBirthdate = '';
    let pwdData=[];
    let genreId = 0;
    const tabGenre = ['man', 'woman'];
    while (compteur < 500)
    {
      pwdData = hashPwd('Qwerty123');
      genreId = Math.floor(Math.random() * 2);
      while (tmpName === 'empty' || userExists(tmpSurname, tmpName))
      {
        tmpName = names[Math.floor(Math.random() * names.length)];
        if (genreId == 1){
          tmpSurname = surnamesWoman[Math.floor(Math.random() * surnamesWoman.length)];
        } else {
          tmpSurname = surnamesMan[Math.floor(Math.random() * surnamesMan.length)];
        }
      }
      tmpBirthdate = randomDate('01/01/1988', '01/01/1998');
      client.query(`INSERT INTO 
      users 
      (login, hashPwd, salt, email, surname, name, genre, birthdate) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [tmpSurname+'_'+tmpName, pwdData[0], pwdData[1], tmpSurname+'_'+tmpName+'@yopmail.com', tmpSurname, tmpName, tabGenre[genreId], tmpBirthdate]);
      compteur = compteur + 1;
      tmpName = 'empty';
    }
  }
}
