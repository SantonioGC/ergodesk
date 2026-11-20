//conexion a la db
const mysql = require("mysql2/promise");
const pool = mysql.createPool({
  host:     process.env.DB_HOST     || "127.0.0.1",
  user:     process.env.DB_USER     || "root",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME     || "ergodesk",
  waitForConnections: true,
  connectionLimit: 5
});

//corre varias consultas como una sola transaccion
pool.transaccion = async (fn) => {
  const conn = await pool.getConnection();
  try {
    await conn.query("SET TRANSACTION ISOLATION LEVEL READ COMMITTED");
    await conn.beginTransaction();
    const resultado = await fn(conn);
    await conn.commit();
    return resultado;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

module.exports = pool;
