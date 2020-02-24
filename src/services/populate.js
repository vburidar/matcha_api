import {
  names, firstNamesWoman, firstNamesMan, interests, locations,
} from '../../populate_data/populate';
import AuthService from './auth';
import PostgresService from './postgres';
import Populate from '../models/populate';

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
      tab[cmp].description = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean eu risus vitae arcu elementum molestie sed quis enim. Mauris facilisis nisl ac placerat pulvinar. Aenean vel leo lobortis, rhoncus mi sollicitudin, mattis mi. Praesent ac pulvinar leo, sed consequat ligula. Aliquam erat volutpat. Curabitur volutpat nisl ut nulla lacinia, ac varius velit aliquam. Nulla et semper justo. Cras eleifend, ligula sit amet auctor ultricies, purus nisl ornare tortor, ut vestibulum odio nisl a felis.';
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
    const list = await Populate.getSuggestionList(userLogin);
    const arr = [];
    const ret = [];
    const nbLikeSent = Math.ceil(list.rows.length / 10);
    while (arr.length < nbLikeSent) {
      const r = Math.floor(Math.random() * list.rows.length);
      if (arr.indexOf(r) === -1) arr.push(r);
    }
    arr.map(async (elem) => {
      ret.push(userLogin, list.rows[elem].user_id);
    });
    return (ret);
  }

  static async createRequestLike(tabPromise) {
    const tabLike = tabPromise.reduce((accumulator, currentTab) => [
      ...accumulator,
      ...currentTab,
    ], []);
    let requestLike = `
    WITH virtual_user AS (
      SELECT login, id FROM users
    )
    INSERT into likes (sender_id, receiver_id) VALUES `;
    tabLike.map((elem, idx) => {
      if (idx % 2 === 0) {
        requestLike += `((SELECT id FROM virtual_user WHERE login = $${idx + 1}), $${idx + 2})`;
        if (idx !== tabLike.length - 2) {
          requestLike += ',';
        }
      }
    });
    if (tabLike[0]) {
      return ({ request: requestLike, tab: tabLike });
    }
    return (null);
  }

  static async partitionRequest(type, partitionSize, nUsers, tab) {
    let cmp = 0;
    let request = '';
    let nPartition = 0;
    while (cmp < nUsers) {
      if (cmp % partitionSize === 0 && cmp !== 0) {
        const partitionUser = tab.slice(nPartition * partitionSize, cmp);
        if (type === 'user') {
          request = this.createRequest(partitionUser);
        } else if (type === 'like') {
          request = await this.createRequestLike(partitionUser);
        } else {
          return (null);
        }
        if (request) { await PostgresService.query(request.request, request.tab); }
        nPartition += 1;
      }
      cmp += 1;
    }
    const partitionUser = tab.slice(nPartition * partitionSize, cmp);
    if (type === 'user') {
      request = this.createRequest(partitionUser);
    } else if (type === 'like') {
      request = await this.createRequestLike(partitionUser);
    } else {
      return (null);
    }
    if (request) { await PostgresService.query(request.request, request.tab); }
    return (null);
  }

  static async populate() {
    await Populate.insertInterests();
    const nUsers = 1000;
    const partitionSize = 100;
    const tabUser = this.createNUsers(nUsers);
    await this.partitionRequest('user', partitionSize, nUsers, tabUser);
    const tabPromise = await Promise.all(tabUser.map(async (elem) => {
      this.generateLike(elem.login);
      return (this.generateLike(elem.login));
    }));
    await this.partitionRequest('like', partitionSize, nUsers, tabPromise);
    tabUser.map(async (elem) => {
      await Populate.computePopularityScore(elem.login);
    });
  }
}
