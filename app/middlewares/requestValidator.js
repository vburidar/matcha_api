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
  string() {
    return (val, propertyName) => {
      if (typeof val !== 'string') throw new RvException('invalid-string', 'Invalid string', propertyName);
    };
  },
  password() {
    return (val, propertyName) => {
      if (val.length < 9) throw new RvException('invalid-password-length', 'Invalid password (min: 9)', propertyName);
      if (val.match(/[0-9]/) === null) throw new RvException('invalid-password-digit', 'Invalid password (no digit)', propertyName);
      if (val.match(/[A-Z]/) === null) throw new RvException('invalid-password-uppercase', 'Invalid password (no upper-case letter)', propertyName);
      if (val.match(/[a-z]/) === null) throw new RvException('invalid-password-lowercase', 'Invalid password (no lower-case letter)', propertyName);
    };
  },
  email() {
    return (val, propertyName) => {
      if (val.match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/ig) === null) throw new RvException('Invalid email', propertyName);
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
