import Event from '../models/Event';
import { ErrException } from '../api/middlewares/errorHandler';
import {
  names, firstNamesWoman, firstNamesMan, interests, locations,
} from '../../populate_data/populate';
import AuthService from './auth';
import PostgresService from './postgres';

export default class PopulateService {
  static randomDate(dateStart, dateEnd) {
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

  static createLocation() {
    const randomPopulation = Math.random();
    const randomLatitude = Math.random();
    const randomLongitude = Math.random();
    const matchingCity = locations.filter((location) => location.population > randomPopulation)[0];
    const latitude = matchingCity.center.latitude + (randomLatitude * 2 - 1) * (matchingCity.radius / 111.12);
    const longitude = matchingCity.center.longitude + (randomLongitude * 2 - 1) * (matchingCity.radius / 111.12);
    return {
      latitude, longitude, name: matchingCity.name, isActive: true,
    };
  }

  static createPic() {
    const imageId = Math.floor(Math.random() * 1000) + 1;
    return (`https://i.picsum.photos/id/${imageId}/500/500.jpg`);
  }

  static createInterests() {
    const ret = [];
    const givenInterests = [];
    const nbInsert = 3 + Math.floor(Math.random() * 5);
    let compteur = 0;
    let tmp = 0;
    while (compteur < nbInsert) {
      tmp = 0;
      while (tmp === 0 || givenInterests.includes(tmp)) {
        tmp = Math.floor(Math.random() * interests.length);
      }
      ret[compteur] = tmp;
      givenInterests.push(tmp);
      compteur += 1;
    }
    return (ret);
  }

  static createNUsers(nbUsers) {
    let cmp = 0;
    const tab = [];
    const givenLogin = [];

    while (cmp < nbUsers) {
      tab[cmp] = [];
      tab[cmp].gender = Math.floor(Math.random() * 2) + 1;
      while (tab[cmp].firstName === undefined || givenLogin.includes(tab[cmp].firstName + tab[cmp].lastName)) {
        if (tab[cmp].gender === 2) {
          tab[cmp].firstName = firstNamesWoman[Math.floor(Math.random() * firstNamesWoman.length)];
        } else {
          tab[cmp].firstName = firstNamesMan[Math.floor(Math.random() * firstNamesMan.length)];
        }
        tab[cmp].lastName = names[Math.floor(Math.random() * names.length)];
      }
      givenLogin.push(tab[cmp].firstName + tab[cmp].lastName);
      tab[cmp].sexualPreference = Math.floor(Math.random() * 3) + 1;
      tab[cmp].login = `${tab[cmp].firstName}_${tab[cmp].lastName}`;
      tab[cmp].email = `${tab[cmp].login}@yopmail.com`;
      tab[cmp].pwdData = AuthService.hashPwd('Qwerty123');
      tab[cmp].birthdate = this.randomDate('01/01/1988', '01/01/1998');
      tab[cmp].validated = true;
      tab[cmp].description = 'beep bop I am a bot';
      tab[cmp].popularityScore = 0;
      tab[cmp].locations = this.createLocation();
      tab[cmp].interests = this.createInterests();
      tab[cmp].pics = this.createPic();
      cmp += 1;
    }
    return (tab);
  }

  static createRequestUser(tabUser, startId) {
    const tabRequest = tabUser.reduce((accumulator, currentUser) => [
      ...accumulator,
      currentUser.login,
      currentUser.pwdData[0],
      currentUser.pwdData[1],
      currentUser.email,
      currentUser.firstName,
      currentUser.lastName,
      currentUser.gender,
      currentUser.birthdate,
      currentUser.validated,
      currentUser.description,
      currentUser.sexualPreference,
      currentUser.popularityScore,
    ], []);
    let requestUser = `INSERT INTO users (login, password, salt, email, 
        first_name,last_name, gender, birthdate, validated,description, sexual_preference, 
        popularity_score) VALUES (`;
    tabRequest.map((elem, idx) => {
      requestUser += `$${(startId + idx + 1).toString()}`;
      if ((idx + 1) % 12 !== 0) {
        requestUser += ', ';
      } else if (idx + 1 !== tabRequest.length) {
        requestUser += '), (';
      } else {
        requestUser += ')';
      }
    });
    requestUser = `WITH virtual_users AS(${requestUser} RETURNING *)`;
    return ({ request: requestUser, tab: tabRequest, id: tabRequest.length + startId });
  }

  static createRequestLocation(tabUser, startId) {
    const tabRequest = tabUser.reduce((accumulator, currentUser) => [
      ...accumulator,
      currentUser.login,
      currentUser.locations.latitude,
      currentUser.locations.longitude,
      currentUser.locations.isActive,
      currentUser.locations.name,
    ], []);
    let requestLocation = 'INSERT INTO locations (user_id, latitude, longitude, is_active, name) VALUES';
    tabRequest.map((elem, idx) => {
      const tmpLogin = startId + idx + 1;
      if (idx % 5 === 0) {
        requestLocation += ` ((SELECT id FROM virtual_users WHERE login = $${tmpLogin.toString()}), `;
      } else if ((idx + 1) % 5 === 0) {
        requestLocation += `$${(startId + idx + 1).toString()})`;
        if (idx + 1 !== tabRequest.length) {
          requestLocation += ',';
        }
      } else {
        requestLocation += `$${(startId + idx + 1).toString()},`;
      }
      return (null);
    });
    requestLocation = `virtual_location AS(${requestLocation} RETURNING *)`;
    if (startId === 0) {
      requestLocation = `WITH ${requestLocation}`;
    } else {
      requestLocation = `, ${requestLocation}`;
    }
    return ({ request: requestLocation, tab: tabRequest, id: tabRequest.length + startId });
  }

  static createRequestPic(tabUser, startId) {
    const tabRequest = tabUser.reduce((accumulator, currentUser) => [
      ...accumulator,
      currentUser.login,
      currentUser.pics,
      true,
    ], []);
    let requestPic = 'INSERT INTO images (user_id, path, is_profile) VALUES';
    tabRequest.map((elem, idx) => {
      const tmpLogin = startId + idx + 1;
      if (idx % 3 === 0) {
        requestPic += ` ((SELECT id FROM virtual_users WHERE login = $${tmpLogin.toString()}), `;
      } else if ((idx + 1) % 3 === 0) {
        requestPic += `$${(startId + idx + 1).toString()})`;
        if (idx + 1 !== tabRequest.length) {
          requestPic += ',';
        }
      } else {
        requestPic += `$${(startId + idx + 1).toString()},`;
      }
      return (null);
    });
    requestPic = `virtual_pic AS(${requestPic} RETURNING *)`;
    if (startId === 0) {
      requestPic = `WITH ${requestPic}`;
    } else {
      requestPic = `, ${requestPic}`;
    }
    return ({ request: requestPic, tab: tabRequest, id: tabRequest.length + startId });
  }

  static createRequestInterests(tabUser, startId) {
    const tabTmp = tabUser.reduce((accumulator, currentUser) => [
      ...accumulator,
      currentUser.login,
      currentUser.interests,
    ], []);
    const tabRequest = tabUser.reduce((accumulator, currentUser) => [
      ...accumulator,
      currentUser.login,
      ...currentUser.interests,
    ], []);
    let requestInterest = 'INSERT INTO users_interests (user_id, interest_id) VALUES';
    let idxUser = 0;
    let cmpVarRequest = 1;
    tabTmp.map((elem, idx) => {
      if (idx % 2 === 0) {
        idxUser = cmpVarRequest + startId;
        cmpVarRequest += 1;
      }
      if (idx % 2 === 1) {
        elem.map((elemInt, idxInt) => {
          requestInterest += ` ((SELECT id FROM virtual_users WHERE login = $${idxUser.toString()}), `;
          requestInterest += `$${cmpVarRequest + startId})`;
          if (idx !== tabTmp.length - 1 || idxInt !== elem.length - 1) {
            requestInterest += ',';
          }
          cmpVarRequest += 1;
        });
      }
    });
    return ({ request: requestInterest, tab: tabRequest, id: cmpVarRequest });
  }

  static createRequest(partitionUser) {
    const requestUser = this.createRequestUser(partitionUser, 0);
    const requestLocation = this.createRequestLocation(partitionUser, requestUser.id);
    const requestPic = this.createRequestPic(partitionUser, requestLocation.id);
    const requestInterest = this.createRequestInterests(partitionUser, requestPic.id);
    const bigRequest = requestUser.request + requestLocation.request + requestPic.request + requestInterest.request;
    const bigTab = requestUser.tab.concat(requestLocation.tab).concat(requestPic.tab).concat(requestInterest.tab);
    return ({ request: bigRequest, tab: bigTab });
  }

  static async generateLike(userLogin) {
    const list = await PostgresService.query(`
    WITH virtual_user AS (
      SELECT 
        users.id,
        EXTRACT (YEAR FROM AGE(users.birthdate)) AS age,
        sexual_preference,
        gender,
        latitude,
        longitude
      FROM (SELECT * FROM users WHERE login = $1) AS users
      INNER JOIN locations ON users.id = locations.user_id),
    virtual_interests AS (
      SELECT * FROM ( SELECT * FROM users_interests WHERE user_id = (SELECT id FROM virtual_user)) AS interests),
    nb_interest AS (
      SELECT COUNT(*) AS value FROM users_interests WHERE user_id = (SELECT id FROM virtual_user))
      
      SELECT
      interests.user_id, 
      interests.common_interests, 
      locations.distance,
      users.gender AS gender_receiver,
      users.sexual_preference::bit(4) AS pref_receiver,
      (SELECT gender FROM virtual_user)::int as gender_sender,
      (SELECT sexual_preference FROM virtual_user)::int as pref_sender,
      abs((SELECT age FROM virtual_user) - EXTRACT (YEAR FROM AGE(users.birthdate))) as age_difference,
      log(1 + (exp(1) - 1) * (common_interests::float / (SELECT value FROM nb_interest))) AS score_interest,
      1 / (exp(abs((SELECT age FROM virtual_user) - EXTRACT (YEAR FROM AGE(users.birthdate)))/10)) as score_age,
      1 / (exp(distance / 10)) AS score_distance,
      log(1 + 1.7 * (common_interests::float / (SELECT value FROM nb_interest))) + 1 / (exp(abs((SELECT age FROM virtual_user) - EXTRACT (YEAR FROM AGE(users.birthdate)))/10)) + 1 / (exp(distance / 10)) AS score
    FROM users
    
    INNER JOIN
      (SELECT
        user_id, 
        111 * |/((latitude - (SELECT latitude FROM virtual_user))^2 + (longitude - (SELECT longitude FROM virtual_user))^2) AS distance 
      FROM locations) AS locations
    ON locations.user_id = users.id
    
    INNER JOIN
      
      (SELECT
        user_id,
        COUNT (*) AS common_interests
      FROM
        (SELECT  * FROM users_interests WHERE user_id != (SELECT id FROM virtual_user)) AS test1

      INNER JOIN
        (SELECT interest_id FROM users_interests WHERE user_id = (SELECT id FROM virtual_user)) AS test2
      ON test1.interest_id = test2.interest_id
      GROUP BY user_id) AS interests
    
    ON locations.user_id = interests.user_id

    WHERE locations.distance < 20
    AND (SELECT sexual_preference FROM virtual_user) & users.gender != 0
    AND (SELECT gender FROM virtual_user) & users.sexual_preference != 0
    ORDER BY score DESC`, [userLogin]);
    const arr = [];
    const nbLikeSent = Math.ceil(list.rows.length / 10);
    while (arr.length < nbLikeSent) {
      const r = Math.floor(Math.random() * list.rows.length);
      if (arr.indexOf(r) === -1) arr.push(r);
    }
    arr.map(async (elem) => {
      await PostgresService.query(`
      WITH virtual_user AS(
        SELECT id FROM users WHERE login = $1
      )
      INSERT INTO likes (receiver_id, sender_id) VALUES ((SELECT id FROM virtual_user) , $2)`, [userLogin, list.rows[elem].user_id]);
    });
    return (null);
  }

  static async populate() {
    Object.keys(interests).forEach(async (key) => {
      await PostgresService.query('INSERT INTO interests (name) VALUES ($1)', [interests[key]]);
    });
    const nUsers = 10000;
    const partitionSize = 1000;
    let nPartition = 0;
    const tabUser = this.createNUsers(nUsers);
    let cmp = 0;
    while (cmp < nUsers) {
      if (cmp % partitionSize === 0 && cmp !== 0) {
        const partitionUser = tabUser.slice(nPartition * partitionSize, cmp);
        const bigRequest = this.createRequest(partitionUser);
        await PostgresService.query(bigRequest.request, bigRequest.tab);
        nPartition += 1;
      }
      cmp += 1;
    }
    const partitionUser = tabUser.slice(nPartition * partitionSize, cmp);
    const bigRequest = this.createRequest(partitionUser);
    await PostgresService.query(bigRequest.request, bigRequest.tab);
    tabUser.map(async (elem) => {
      this.generateLike(elem.login);
    });
  }
}
