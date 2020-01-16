import dotenv from 'dotenv';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';

import setup from './config/setup';
import sessionManager from './config/sessionManager';
import { requestValidator } from './middlewares/requestValidator';
import { createUserSchema, createUser } from './users';

dotenv.config();

const app = express();
app.use(cors());

app.use(bodyParser.json());

app.use(sessionManager());

app.get('/setup_database', setup.setupDatabase);
app.get('/reset_database', setup.resetDatabase);

app.post('/api/users', requestValidator(createUserSchema), createUser);

app.get('/', (req, res) => {
  console.log(req.session);
  req.session.toto = 'toto';
  res.send('Root of API');
});

console.log(`Server started on port ${process.env.APP_PORT}`);
app.listen(process.env.APP_PORT);
