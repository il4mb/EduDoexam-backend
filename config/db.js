// config/db.js
const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: '/cloudsql/your-project-id:your-region:your-instance-id',  // Cloud SQL connection name
  user: 'your-db-user',
  password: 'your-db-password',
  database: 'edu_doexam_db',
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to database:', err.stack);
    return;
  }
  console.log('Connected to the database as id ' + connection.threadId);
});

module.exports = connection;
