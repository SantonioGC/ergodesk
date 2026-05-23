// db.js — Conexión a MySQL

const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || "127.0.0.1",
  user:     process.env.DB_USER     || "root",
  password: process.env.DB_PASSWORD || "1234",
  database: process.env.DB_NAME     || "ergodesk",
  waitForConnections: true,
  connectionLimit: 10
});

module.exports = pool;
