import pg from 'pg'
import crypto from 'crypto'

const Client = pg.Client

const client = new Client({
  user: 'vburidar',
  host: 'localhost',
  database: 'matcha',
  password: '',
  port: 5432,
})
client.connect()

function hash_pwd(raw_pwd)
{
  const salt = crypto.randomBytes(Math.ceil(8)).toString('hex').slice(0, 16);
  const hash_pwd = crypto.createHash('whirlpool').update(raw_pwd + salt).digest("hex");
  return ([hash_pwd, salt]);
}

async function createUser (req, res) {
  const hash_data = hash_pwd(req.body.password)
  const user = await client.query(
    'INSERT INTO users (login, hash_pwd, salt, email) VALUES ($1, $2, $3, $4) RETURNING *',
    [
      req.body.login,
      hash_data[0],
      hash_data[1],
      req.body.email,
    ]
  )
  res.json(user.rows[0])
}

export default createUser