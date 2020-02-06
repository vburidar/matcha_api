# Matcha

## Folder architecture

The folder architecture is greatly inspired by this very complete article:
https://softwareontheroad.com/ideal-nodejs-project-structure/

## Request validator

Each time you create a route, you will have to implement data validation for incoming HTTP request.

First, import the list of rules, named rv, then create a schema to compare with HTTP request, and export it:
```js
import { rv } from './middlewares/requestValidator';

function createUser() {
  // Code
}

const createUserSchema = {
  body: {
    login: [rv.required(), rv.string()],
    password: [rv.required(), rv.string(), rv.password()],
    email: [rv.required(), rv.string(), rv.email()],
    birthdate: [rv.required(), rv.date(), rv.birthdate()],
    validated: [rv.required(), rv.bool()],
  },
};

export { createUser, createUserSchema };
```

List of available rules:

Rule Name | Description | Rule Priority
--------- | ----------- | -------------
required | | 1
string | | 2
password | At least 9 characters long, 1 uppercase, 1 lowercase, 1 digit | 3
email | | 3
date | | 2
birthdate | Not under 18yo and over 80yo | 3
bool | | 2

The lower the priority, the sooner you should add it in rules array (cf example above)

## Transaction manager

Here is an example on how to use the transaction manager:
```js
import PostgresService from '../../services/postgres';

try {
  await PostgresService.createTransaction();

  const ret = await PostgresService.addQueryToTransaction(
    'INSERT INTO users (login, hashpwd, salt, email) VALUES($1, $2, $3, $4) RETURNING *',
    ['toto', 'xxx', 'xxx', 'toto@gmail.com'],
  );

  await PostgresService.commitTransaction();
  
  res.send(ret.rows[0]); // Return the user created
} catch (err) {
  res.status(500).json({ message: 'Transaction failed, rollback', err });
}
```

The transaction manager can keep the queries returns for you, so that you can add queries to the transaction from multiple files easily.

To do that, just add an optional third parameter to `addQueryToTransaction`:
```js
  const ret = await PostgresService.addQueryToTransaction(
    'INSERT INTO users (login, hashpwd, salt, email) VALUES($1, $2, $3, $4) RETURNING *',
    ['toto', 'xxx', 'xxx', 'toto@gmail.com'],
    'addToto', // Name to identify the query
  );
```

And access the id of toto later with `getQueryResult`:
```js
  const ret = PostgresService.getQueryResult('addToto');
  // ret.rows[0].id
```