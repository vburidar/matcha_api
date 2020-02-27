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

    async function getUserId(firstName, lastName) {
      const resp = await client.query('SELECT id FROM users WHERE first_name=$1 AND last_name=$2', [firstName, lastName]);
      return (resp.rows[0].id);
    }

    async function createInterests(userId) {
      const resp = await client.query('SELECT id FROM interests');
      const nbInsert = 3 + Math.floor(Math.random() * 5);
      let compteur = 0;
      while (compteur < nbInsert) {
        const id = Math.floor(Math.random() * resp.rows.length);
        await client.query('INSERT INTO users_interests (user_id, interest_id) VALUES ($1, $2)', [userId, resp.rows[id].id]);
        compteur += 1;
      }
    }

    async function createPic(userId) {
      const imageId = Math.floor(Math.random() * 1000) + 1;
      const path = `https://i.picsum.photos/id/${imageId}/500/500.jpg`;
      await client.query('INSERT INTO images (path, user_id, is_profile) VALUES ($1, $2, $3) RETURNING id', [path, userId, true]);
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
      await client.query(`INSERT INTO locations 
      (user_id, latitude, longitude, is_active, name)
      VALUES ($1, $2, $3, $4, $5)`, [userId, location.latitude, location.longitude, true, location.name]);
    }

    async function multifactorMatching(userId, userLat, userLong, nbInterests, userAge, userPref, userGender) {
      const suggestionList = await client.query(`
      SELECT
        interests.user_id, 
        interests.common_interests, 
        locations.distance,
        
        users.gender AS gender_receiver,
        users.sexual_preference::bit(4) AS pref_receiver,
        $7::int as gender_sender,
        $6::int as pref_sender,
        abs($5 - EXTRACT (YEAR FROM AGE(users.birthdate))) as age_difference,
        
        log(1 + (exp(1) - 1) * (common_interests::float / $4)) AS score_interest,
        1 / (exp(abs($5 - EXTRACT (YEAR FROM AGE(users.birthdate)))/10)) as score_age,
        1 / (exp(distance / 10)) AS score_distance,
        log(1 + 1.7 * (common_interests::float / $4)) + 1 / (exp(abs($5 - EXTRACT (YEAR FROM AGE(users.birthdate)))/10)) + 1 / (exp(distance / 10)) AS score
      FROM users
      
      INNER JOIN
        (SELECT
          user_id, 
          111 * |/((latitude - $2)^2 + (longitude - $3)^2) AS distance 
        FROM locations) AS locations
      ON locations.user_id = users.id
      
      INNER JOIN
        
        (SELECT
          user_id,
          COUNT (*) AS common_interests
        FROM
          (SELECT  * FROM users_interests WHERE user_id != $1) AS test1

        INNER JOIN
          (SELECT interest_id FROM users_interests WHERE user_id = $1) AS test2
        ON test1.interest_id = test2.interest_id
        GROUP BY user_id) AS interests
      
      ON locations.user_id = interests.user_id

      WHERE locations.distance < 20
      AND $6 & users.gender != 0
      AND $7 & users.sexual_preference != 0
      ORDER BY score DESC`, [userId, userLat, userLong, nbInterests, userAge, userPref, userGender]);
      // console.log(suggestionList.rows);
      return (suggestionList);
    }

    async function generateLikes(list, userId) {
      // console.log('generates like for user', userId);
      const arr = [];
      const nbLikeSent = Math.ceil(list.rows.length / 10);
      while (arr.length < nbLikeSent) {
        const r = Math.floor(Math.random() * list.rows.length);
        if (arr.indexOf(r) === -1) arr.push(r);
      }
      let compteur = 0;
      while (compteur < arr.length) {
        await client.query('INSERT INTO likes (receiver_id, sender_id) VALUES ($1, $2)', [userId, list.rows[arr[compteur]].user_id]);
        compteur += 1;
      }
    }

    async function getSuggestionList(userId) {
      // console.log('userId = ', userId);
      const ownLoc = await client.query('SELECT * FROM locations WHERE user_id = $1', [userId]);
      const interest = await client.query('SELECT * FROM users_interests WHERE user_id = $1', [userId]);
      const age = await client.query('SELECT EXTRACT (YEAR FROM AGE(birthdate)) AS age FROM users WHERE id = $1', [userId]);
      const pref = await client.query('SELECT sexual_preference, gender FROM users WHERE id = $1', [userId]);
      // console.log('userId =', userId, 'location = ', ownLoc.rows);
      const list = await multifactorMatching(userId, ownLoc.rows[0].latitude, ownLoc.rows[0].longitude, interest.rows.length, age.rows[0].age, pref.rows[0].sexual_preference, pref.rows[0].gender);
      await generateLikes(list, userId);
      const nbLike = await EventModel.getNbLikes(userId);
      // console.log(nbLike);
      if (nbLike !== undefined) {
        const score = EventService.createScore(nbLike.nb_likes_received, nbLike.nb_likes_sent,
          nbLike.nb_match);
        // console.log('score user=', score);
        EventModel.updatePopularityScore(score, userId);
      }
    }

    async function getAllUsersId() {
      const resp = await client.query('SELECT id FROM users');
      return (resp.rows);
    }

    async function createUser() {
      let tmpLastName = 'empty';
      let tmpFirstName = '';
      let tmpBirthdate = '';
      let test = false;
      const pwdData = hashPwd('Qwerty123');
      tmpBirthdate = randomDate('01/01/1988', '01/01/1998');
      const genderId = Math.floor(Math.random() * 2) + 1;
      while (tmpLastName === 'empty' || test === false) {
        test = true;
        tmpLastName = names[Math.floor(Math.random() * names.length)];
        if (genderId === 2) {
          tmpFirstName = firstNamesWoman[Math.floor(Math.random() * firstNamesWoman.length)];
        } else {
          tmpFirstName = firstNamesMan[Math.floor(Math.random() * firstNamesMan.length)];
        }
      }
      try {
        await client.query(`INSERT INTO 
      users 
      (login, password, salt, email, first_name, last_name, gender, birthdate, validated,
        description, sexual_preference, popularity_score)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [`${tmpFirstName}_${tmpLastName}`, pwdData[0], pwdData[1], `${tmpFirstName}_${tmpLastName}@yopmail.com`,
          tmpFirstName, tmpLastName, genderId, tmpBirthdate, true,
          'beep bop I\'m a bot', 1 + Math.floor(Math.random() * 3), 0]);
        const userId = await getUserId(tmpFirstName, tmpLastName);
        await createInterests(userId);
        await createLocation(userId);
        await createPic(userId, genderId);
      } catch (err) {
        test = false;
      }
    }

    let compteur = 0;
    Object.keys(interests).forEach(async (key) => {
      await client.query('INSERT INTO interests (name) VALUES ($1)', [interests[key]]);
    });
    while (compteur < 1000) {
      await createUser(compteur);
      compteur += 1;
    }
    compteur = 0;
    const userId = await getAllUsersId();
    while (compteur < userId.length) {
      await getSuggestionList(userId[compteur].id);
      compteur += 1;
    }
  }

  static createLocation() {
    return ('bonjour');
  }

  static createNUsers(nbUsers) {
    let cmp = 0;
    const tab = [];
    const givenLogin = [];

    while (cmp < nbUsers) {
      tab[cmp].gender = Math.floor(Math.random() * 2) + 1;
      while (tab[cmp].firstName === undefined || givenLogin.includes(tab[cmp].firstName + tab[cmp])) {
        if (tab[cmp].gender === 2) {
          tab[cmp].firstName = firstNamesWoman[Math.floor(Math.random() * firstNamesWoman.length)];
        } else {
          tab[cmp].firstName = firstNamesMan[Math.floor(Math.random() * firstNamesMan.length)];
        }
      }
      tab[cmp].sexualPreference = Math.floor(Math.random() * 3);
      tab[cmp].login = `${tab[cmp].firstName}_${tab[cmp].lastName}`;
      tab[cmp].email = `${tab[cmp].login}@yopmail.com`;
      tab[cmp].pwdData = hashPwd('Qwerty123');
      tab[cmp].birthdate = randomDate('01/01/1988', '01/01/1998');
      tab[cmp].validated = true;
      tab[cmp].description = 'beep bop I am a bot';
      tab[cmp].location = createLocation();
      tab[cmp].interests = createInterests();
      tab[cmp].pics = createPics();
      cmp += 1;
    }
  }