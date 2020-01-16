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
