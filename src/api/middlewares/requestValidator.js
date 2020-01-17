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
        throw new ErrException({ id: 'missing', description: 'Missing', propertyName });
      }
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
          throw new ErrException({id:'invalid-email', description: 'Invalid email', propertyName });
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
          throw new ErrException({ id: 'invalid-boolean', description: 'Invalid boolean', propertyName} );
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
