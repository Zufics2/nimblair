const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'nimblair',
    password: '2009', 
    port: 5432,
});

// const { Pool } = pkg;

// const DATABASE_URL = 'postgresql://postgres:PxkjrhkIaaurXWdRcrheqCuupjorEYEM@yamabiko.proxy.rlwy.net:26615/railway'

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false }
// });

// export default pool;

pool.on('connect', () => {
    console.log('Подключено к базе данных');
});

pool.on('error', (err) => {
    console.error('Ошибка подключения к БД:', err);
});

module.exports = pool;