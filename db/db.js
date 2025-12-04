
const mysql = require("mysql2/promise");
const config = require("../config.json");


const connection = mysql.createPool({
  host: config.DB_HOST,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  database: config.DB_NAME,
  port: config.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});


(async () => {
  try {
    const conn = await connection.getConnection();
    await conn.ping();
    console.log("✓ MySQL connection established");
    conn.release();
  } catch (err) {
    console.error("✗ MySQL connection failed:", err.message);
  }
})();

module.exports = connection;
