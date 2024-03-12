var mysql = require('mysql2');
require('dotenv').config()
console.log(process.env.DB_USERNAME);
var con = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    debug: false
});

con.connect(function (err) {
    if (err) throw err;
    console.log("Connected!");
});

module.exports = con