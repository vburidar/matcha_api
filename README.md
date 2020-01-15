# Matcha

## Request validator

Each time you create a route, you will have to implement data validation for incoming HTTP request.

First, import the list of rules, named rv:
```js
import { rv } from './middlewares/requestValidator';
```

Then, create a schema to compare with HTTP request, like this:
```js
const createUserSchema = {
  body: {
    login: [rv.required(), rv.string()],
    password: [rv.required(), rv.string(), rv.password()],
    email: [rv.required(), rv.string(), rv.email()],
    birthdate: [rv.required(), rv.date(), rv.birthdate()],
    validated: [rv.required(), rv.bool()],
  },
};
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
