import { DateTime } from 'luxon';
import { ErrException } from './errorHandler';

function requestValidator(schema) {
  return (req, res, next) => {
    const requestData = req.body;

    try {
      /** Iterate through all properties to validate in body (email, password...) */
      Object.keys(schema.body).forEach((propertyName) => {
        /** Iterate through all schema rules for current property (type, length, regex...) */
        schema.body[propertyName].forEach((validationFunction) => {
          /** Compare data from current property with current rule */
          validationFunction(requestData[propertyName], propertyName);
        });
      });
    } catch (err) {
      return next(err);
    }
    return next();
  };
}

const rv = {
  required() {
    return (val, propertyName) => {
      if (typeof val === 'undefined') {
        throw new ErrException({ id: 'missing', description: `Missing${propertyName}` });
      }
    };
  },
  locations() {
    return (val, propertyName) => {
      if (typeof val === 'undefined') {
        throw new ErrException({ id: 'missing', description: `Missing${propertyName}` });
      }
      val.map((elem) => {
        if (typeof (elem.latitude) !== 'number') {
          throw new ErrException({ id: 'missing', description: 'locations.latitude is missing or of wrong format', propertyName });
        } if (typeof (elem.longitude) !== 'number') {
          throw new ErrException({ id: 'missing', description: 'locations.longitude is missing or of wrong format', propertyName });
        } if (typeof (elem.isActive) !== 'boolean') {
          throw new ErrException({ id: 'missing', description: 'locations.longitude is missing or of wrong format', propertyName });
        } if (typeof (elem.name) !== 'string') {
          throw new ErrException({ id: 'missing', description: 'locations.longitude is missing or of wrong format', propertyName });
        } if (typeof (elem.label) !== 'string') {
          throw new ErrException({ id: 'missing', description: 'locations.longitude is missing or of wrong format', propertyName });
        }
        if (elem.name.length < 2 || elem.name.length > 20) {
          throw new ErrException({ id: 'name_invalid', description: 'locations.name should be between 2 and 20 caracters', propertyName });
        } if (elem.longitude < -180 || elem.longitude > 180) {
          throw new ErrException({ id: 'longitude_invalid', description: 'locations.longitude must be between -180 and 180', propertyName });
        } if (elem.latitude < -90 || elem.latitude > 90) {
          throw new ErrException({ id: 'latitude_invalid', description: 'locations.latitude must be between -90 and 90', propertyName });
        }
        return ({ type: 'success', description: 'success' });
      });
    };
  },
  pictures() {
    return (val, propertyName) => {
      if (typeof (val) === 'undefined') {
        throw new ErrException({ id: 'missing', description: `Missing${propertyName}` });
      }
      val.map((elem) => {
        if (typeof (elem.data) !== 'string') {
          throw new ErrException({ id: 'missing', description: 'pictures.data is missing or of wrong format' });
        } if (typeof (elem.isProfile) !== 'boolean') {
          throw new ErrException({ id: 'missing', description: 'pictures.isProfile is missing or of wrong format' });
        }
        return ({ type: 'success', description: 'success' });
      });
    };
  },
  user() {
    return (val, propertyName) => {
      if (typeof (val) === 'undefined') {
        throw new ErrException({ id: 'missing', description: `Missing${propertyName}` });
      } if (val.email && typeof (val.email) !== 'string') {
        throw new ErrException({ id: 'missing', description: 'user.email is missing or of wrong format' });
      } if (val.login && typeof (val.login) !== 'string') {
        throw new ErrException({ id: 'missing', description: 'user.login is missing or of wrong format' });
      } if (typeof (val.firstName) !== 'string') {
        throw new ErrException({ id: 'missing', description: 'user.firstName is missing or of wrong format' });
      } if (typeof (val.lastName) !== 'string') {
        throw new ErrException({ id: 'missing', description: 'user.lastName is missing or of wrong format' });
      } if (typeof (val.birthdate) !== 'string') {
        throw new ErrException({ id: 'missing', description: 'user.birthdate is missing or of wrong format' });
      } if (typeof (val.gender) !== 'number') {
        throw new ErrException({ id: 'missing', description: 'user.gender is missing or of wrong format' });
      } if (typeof (val.sexualPreference) !== 'number') {
        throw new ErrException({ id: 'missing', description: 'user.sexualPreference is missing or of wrong format' });
      } if (typeof (val.description) !== 'string') {
        throw new ErrException({ id: 'missing', description: 'userdescription is missing or of wrong format' });
      }
      if (!/^([a-zA-Z]|-|\.|\s){2,20}$/.test(val.firstName)) {
        throw new ErrException({ id: 'invalid', description: 'user.firstName is of wrong format' });
      } if (!/^([a-zA-Z]|-|\.|\s){2,20}$/.test(val.lastName)) {
        throw new ErrException({ id: 'invalid', description: 'user.lastName is of wrong format' });
      } if (val.login && !/^([a-zA-Z0-9]|_){2,20}$/.test(val.login)) {
        throw new ErrException({ id: 'invalid', description: 'user.login is of wrong format' });
      } if (val.email && !/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/ig.test(val.email)) {
        throw new ErrException({ id: 'invalid', description: 'user.email is of wrong format' });
      }
      const minDate = Date.parse('04/03/2002');
      const maxDate = Date.parse('04/03/1920');
      const birthdate = Date.parse(val.birthdate);
      if (Number.isNaN(birthdate) || birthdate < maxDate || birthdate > minDate) {
        throw new ErrException({ id: 'invalid', description: 'user.birthdate is invalid' });
      } if (![1, 2, 4, 8].includes(val.gender)) {
        throw new ErrException({ id: 'invalid', description: 'user.gender is invalid' });
      } if (val.sexualPreference < 1 || val.sexualPreference > 15) {
        throw new ErrException({ id: 'invalid', description: 'user.sexualPreference is invalid' });
      } if (val.description.lenght > 1024) {
        throw new ErrException({ id: 'invalid', description: 'user.description is invalid' });
      }
    };
  },
  interests() {
    return (val, propertyName) => {
      if (typeof (val) === 'undefined') {
        throw new ErrException({ id: 'missing', description: `Missing${propertyName}` });
      }
      val.map((elem) => {
        if (typeof (elem) !== 'string') {
          throw new ErrException({ id: 'invalid', description: 'interest is of invalid format' });
        }
        if (!/^[a-z0-9-'._]{2,64}$/.test(elem)) {
          throw new ErrException({ id: 'invalid', description: `interest \'${elem}\' is of invalid format` });
        }
        return ({ type: 'success', description: 'success' });
      });
    };
  },
  string() {
    return (val, propertyName) => {
      if (typeof val !== 'undefined') {
        if (typeof val !== 'string') {
          throw new ErrException({ id: 'invalid-string', description: 'Invalid string', propertyName });
        }
      }
    };
  },
  name() {
    return (val, propertyName) => {
      if (!val.match(/^([a-zA-Z]|-|\.|\s){2,20}$/)) {
        throw new ErrException({ id: 'invalid-name', description: 'Invalid Format for Name', propertyName });
      }
    };
  },
  login() {
    return (val, propertyName) => {
      if (!val.match(/^([a-zA-Z1-9]|_){2,20}$/)) {
        throw new ErrException({ id: 'invalid-login', description: 'Invalid Format for Login', propertyName });
      }
    };
  },
  password() {
    return (val, propertyName) => {
      if (typeof val !== 'undefined') {
        if (val.length < 9) {
          throw new ErrException({ id: 'invalid-password-length', decription: 'Invalid password (min: 9)', propertyName });
        }
        if (!/[0-9]/.test(val)) {
          throw new ErrException({ id: 'invalid-password-digit', description: 'Invalid password (no digit)', propertyName });
        }
        if (!/[A-Z]/.test(val)) {
          throw new ErrException({ id: 'invalid-password-uppercase', description: 'Invalid password (no upper-case letter)', propertyName });
        }
        if (!/[a-z]/.test(val)) {
          throw new ErrException({ id: 'invalid-password-lowercase', description: 'Invalid password (no lower-case letter)', propertyName });
        }
      }
    };
  },
  email() {
    return (val, propertyName) => {
      if (typeof val !== 'undefined') {
        if (!/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/ig.test(val)) {
          throw new ErrException({ id: 'invalid-email', description: 'Invalid email', propertyName });
        }
      }
    };
  },
  date() {
    return (val, propertyName) => {
      if (typeof val !== 'undefined') {
        if (
          !/^\d{4}-(0?[1-9]|1[012])-(0?[1-9]|[12][0-9]|3[01])$/.test(val)
          || !DateTime.fromISO(val).isValid
        ) {
          throw new ErrException({ id: 'invalid-date', description: 'Invalid date', propertyName });
        }
      }
    };
  },
  birthdate() {
    return (val, propertyName) => {
      if (typeof val !== 'undefined') {
        const now = DateTime.local();
        const birthdate = DateTime.fromISO(val);

        const diffInYears = now.diff(birthdate, 'years');

        if (diffInYears.values.years < 18) {
          throw new ErrException({ id: 'invalid-birthdate-under-18', description: 'Invalid birthdate (under 18)', propertyName });
        }
        if (diffInYears.values.years > 80) {
          throw new ErrException({ id: 'invalid-birthdate-over-80', description: 'Invalid birthdate (over 80)', propertyName });
        }
      }
    };
  },
  bool() {
    return (val, propertyName) => {
      if (typeof val !== 'undefined') {
        if (typeof val !== 'boolean') {
          throw new ErrException({ id: 'invalid-boolean', description: 'Invalid boolean', propertyName });
        }
      }
    };
  },
  // min: function(min) {
  //   return function(val, propertyName) {
  //     if (val.length < min)
  //       throw new RvException(`String or array too short (min: ${min})`, propertyName);
  //   }
  // },
};

export {
  requestValidator,
  rv,
};
