# SeeYou / Matcha

## What is Matcha?

**Matcha** is a school project at 42 Paris. The objective of this project is to create a fully working dating website from scratch.

## What is SeeYou?

**SeeYou** is the name we choose for our own version of **Matcha**

## Who are the developers behind SeeYou?

We are Thomas and Victor, two students at 42 Paris. If you liked our project, you can contact us at vburidar@student.42.fr.

You can also report any bug at this same address.

## Where can I see the website?

The website is accessible [here](http://seeyou.victorburidard.com). We added an algorithm that populate the databases with fake profiles so you can browse it and explore the different functionalities. 

All the profile have **Firstname_LASTNAME** as login and the well secured **Qwerty123** as password so you can test it easily. Examples of login and password combinations are provided on the Signin page of the website.

You can also create your own account.
# Technical Specificities

You are here in the git repository for the **api part** of SeeYou. If you wish to check out the **client side** of our project, you can go [here](https://github.com/vburidar/matcha_client)

The api was coded in NodeJs with the Express framework.

## Folder architecture

The folder architecture is greatly inspired by this very complete article:
https://softwareontheroad.com/ideal-nodejs-project-structure/


## Middlewares

### Request validator

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

### Transaction manager

Here is an example on how to use the transaction manager:
```js
import PostgresService from '../../services/postgres';

try {
  await PostgresService.createTransaction();

  const ret = await PostgresService.query(
    'INSERT INTO users (login, hashpwd, salt, email) VALUES($1, $2, $3, $4) RETURNING *',
    ['toto', 'xxx', 'xxx', 'toto@gmail.com'],
    true // inTransaction, default to false
  );

  await PostgresService.commitTransaction();
  
  res.send(ret.rows[0]); // Return the user created
} catch (err) {
  res.status(500).json({ message: 'Transaction failed, rollback', err });
}
```

The transaction manager can keep the queries returns for you, so that you can add queries to the transaction from multiple files easily.

To do that, just add an optional fourth parameter to `query`:
```js
  const ret = await PostgresService.query(
    'INSERT INTO users (login, hashpwd, salt, email) VALUES($1, $2, $3, $4) RETURNING *',
    ['toto', 'xxx', 'xxx', 'toto@gmail.com'],
    true, // inTransaction
    'addToto', // Name to identify the query
  );
```

And access the id of toto later with `getQueryResult`:
```js
  const ret = PostgresService.getQueryResult('addToto');
  // ret.rows[0].id
```

### Error Handler

The Error Handler catches all the errors coming from the routes down to the services and models.

The role of the Error Handler is in case of an error to return the proper http error code and description to the client.

Here is an example of the Error Handler in action:

```js
import { Router } from 'express'
import errorHandler from '../middlewares/ErrorHandler';

const route = Router();

export default (app) =>{
	app.use('auth', route);
	
	route.post('/signin',
	async (req, res, next) => {
		try {
		//Body of the signin route function
		} catch (err) {
			//Any caught error in signin route goes through here
			return next(err);
		}
	}
	);

//At the end of the program, the errorHandler catches all errors
app.use(errorHandler);
};
```
### Authorization Validator

The role of the authorization validator is to make sure that the user has the right to execute the request.

For all the requests where the user has to be connected, the authorization validator will deny disconnected user the access to services such as likes, chat or even receiving user information.

```js
route.get('/users',
	//The auth validator middleware prevent the request to access the service if the user is not connected
	authValidator(true),
	async (req, res, next) => {
		try {
		const  listEvent  =  await (UserService.getListUsers(req.session.user_id));
		return  res.status(200).send(listEvent);
		} catch (err) {
			return  next(err);
		}
});
```
