var mysql = require('mysql');
require('dotenv')
var con = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    debug: false
    // auth mode

});

con.connect(function (err) {
    if (err) throw err;
    console.log("Connected!");
});

module.exports = con