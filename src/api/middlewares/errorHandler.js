
function ErrException(rawError) {
  if (typeof rawError === 'string') {
    this.id = rawError;
  } else if (typeof rawError === 'object' && rawError !== null) {
    this.id = rawError.id;
    Object.keys(rawError).forEach((property) => {
      this[property] = rawError[property];
    });
  } else {
    this.id = null;
  }
}

function getErrorDictionary() {
  const dict = {
    '/^.+_not_found$/$': 404,
    '/^.+_already_exists$/': 409,
    '/^.+_already$/': 409,
    '/^.+_invalid$/': 400,
    '/^unauthorized_.+$/': 401,
    '/^.+_unauthorized$/': 401,
    '/^forbidden_.+$/': 403,
    '/^.+_forbidden$/': 403,
    '/^.+_not_modified$/': 304,
    '/^fatal_error$/': 500,
    '/^request_timeout$/': 408,
    '/^I_am_a_teapot$/': 418,
  };
  return (dict);
}

function searchStatus(idError) {
  const dict = getErrorDictionary();
  let errStatus = 400;
  Object.keys(dict).forEach((key) => {
    if (idError.match(key)) {
      errStatus = dict[key];
    }
  });
  return (errStatus);
}

function errorHandler(err, req, res, next) {
  const dateError = new Date(Date.now());
  console.log('*****ERROR*****');
  console.log(dateError.toUTCString());
  console.log(err.id);
  if (err.description) {
    console.log(err.description);
  }
  console.log('Current cookies', req.session.cookie);
  let errStatus = 400;
  if (err.id) {
    errStatus = searchStatus(err.id);
    return res.status(errStatus).send(err.id);
  }
  return res.status(400).send('unknown_error');
}

export { ErrException, errorHandler };
