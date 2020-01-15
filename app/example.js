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

async function example (req, res) {
  const users = await client.query('SELECT * FROM users')
  res.json(users.rows)
}

export default example
