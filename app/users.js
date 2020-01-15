import pg from 'pg'
import hash from 'object-hash'

const Client = pg.Client

const client = new Client({
  user: 'vburidar',
  host: 'localhost',
  database: 'matcha',
  password: '',
  port: 5432,
})
client.connect()

async function createUser (req, res) {
  const hash_pwd = hash(req.body.password, { algorithm: 'whirlpool', enconding: 'base64'});
  const user = await client.query(
    'INSERT INTO users (login, hash_pwd, email) VALUES ($1, $2, $3) RETURNING *',
    [
      req.body.login,
      hash_pwd,
      req.body.email,
    ]
  )
  res.json(user.rows[0])
}

export default createUser