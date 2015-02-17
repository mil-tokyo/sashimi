var assert = require('assert');
var mysql = require('mysql');
var config = require('config');

var connection = null;

var DB = {
	getConnection : function() {
		if (connection == null) {
			connection = mysql.createConnection({
				host : config.database.host,
				user : config.database.user,
				password : config.database.password,
				database : config.database.database
			});
			connection.connect(function(err) {
				assert.ifError(err);
			});
		}
		return connection;
	}
};

module.exports = DB;