import dotenv from 'dotenv';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';

import setup from './config/setup.js'
import sessionManager from './config/sessionManager.js'
import example from './example.js'
import createUser from './users'

dotenv.config();

const app = express();
app.use(cors());

app.use(bodyParser.json());

app.use(sessionManager());

app.get('/setup_database', setup.setup_database)
app.get('/reset_database', setup.reset_database)

app.get('/api/users', example)
app.post('/api/users', createUser)

app.get('/', function(req, res) {
  console.log(req.session);
  req.session.toto = 'toto';
  res.send('Root of API');
})

console.log(`Server started on port ${process.env.APP_PORT}`)
app.listen(process.env.APP_PORT)
