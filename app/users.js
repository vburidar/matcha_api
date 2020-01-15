import pg from 'pg';
import crypto from 'crypto';

const { Client } = pg;

const client = new Client({
  user: 'vburidar',
  host: 'localhost',
  database: 'matcha',
  password: '',
  port: 5432,
});
client.connect();

function hashPwd(rawPwd) {
  const salt = crypto.randomBytes(Math.ceil(8)).toString('hex').slice(0, 16);
  const hashedPwd = crypto.createHash('whirlpool').update(rawPwd + salt).digest('hex');
  return ([hashedPwd, salt]);
}

async function createUser(req, res) {
  const hashData = hashPwd(req.body.password);
  const user = await client.query(
    'INSERT INTO users (login, hashPwd, salt, email) VALUES ($1, $2, $3, $4) RETURNING *',
    [
      req.body.login,
      hashData[0],
      hashData[1],
      req.body.email,
    ],
  );
  res.json(user.rows[0]);
}

export default createUser;
