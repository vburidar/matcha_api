import { DateTime } from 'luxon';

function requestValidator(schema) {
  return (req, res, next) => {
    const requestData = req.body;

    try {
      // Iterate through all properties to validate in body (email, password...)
      Object.keys(schema.body).forEach((propertyName) => {
        // Iterate through all schema rules for current property (type, length, regex...)
        schema.body[propertyName].forEach((validationFunction) => {
          // Compare data from current property with current rule
          validationFunction(requestData[propertyName], propertyName);
        });
      });
    } catch (err) {
      res.status(400).json(err);
      return;
    }
    next();
  };
}

function RvException(id, description, propertyName) {
  this.id = id;
  this.description = description;
  this.propertyName = propertyName;
}

const rv = {
  required() {
    return (val, propertyName) => {
      if (typeof val === 'undefined') {
        throw new RvException('missing', 'Missing', propertyName);
      }
    };
  },
  string() {
    return (val, propertyName) => {
      if (typeof val !== 'undefined') {
        if (typeof val !== 'string') {
          throw new RvException('invalid-string', 'Invalid string', propertyName);
        }
      }
    };
  },
  password() {
    return (val, propertyName) => {
      if (typeof val !== 'undefined') {
        if (val.length < 9) {
          throw new RvException('invalid-password-length', 'Invalid password (min: 9)', propertyName);
        }
        if (!/[0-9]/.test(val)) {
          throw new RvException('invalid-password-digit', 'Invalid password (no digit)', propertyName);
        }
        if (!/[A-Z]/.test(val)) {
          throw new RvException('invalid-password-uppercase', 'Invalid password (no upper-case letter)', propertyName);
        }
        if (!/[a-z]/.test(val)) {
          throw new RvException('invalid-password-lowercase', 'Invalid password (no lower-case letter)', propertyName);
        }
      }
    };
  },
  email() {
    return (val, propertyName) => {
      if (typeof val !== 'undefined') {
        if (!/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/ig.test(val)) {
          throw new RvException('invalid-email', 'Invalid email', propertyName);
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
          throw new RvException('invalid-date', 'Invalid date', propertyName);
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
          throw new RvException('invalid-birthdate-under-18', 'Invalid birthdate (under 18)', propertyName);
        }
        if (diffInYears.values.years > 80) {
          throw new RvException('invalid-birthdate-over-80', 'Invalid birthdate (over 80)', propertyName);
        }
      }
    };
  },
  bool() {
    return (val, propertyName) => {
      if (typeof val !== 'undefined') {
        if (typeof val !== 'boolean') {
          throw new RvException('invalid-boolean', 'Invalid boolean', propertyName);
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
