import pg from 'pg'

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
  const user = await client.query(
    'INSERT INTO users (login, hash_pwd, email) VALUES ($1, $2, $3) RETURNING *',
    [
      req.body.login,
      req.body.password,
      req.body.email,
    ]
  )
  res.json(user.rows[0])
}

export default createUser