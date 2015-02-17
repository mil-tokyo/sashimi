var assert = require('assert');
var config = require('config');
var DB = require('../db');

exports.index = function(req, res) {
	switch(req.body.command) {
		case 'get_datum':
			var sql = 'SELECT * FROM `data` WHERE `data`.`id` = ?';
			var query = DB.getConnection().query(sql, [req.body.data_id], function(err, results) {
				if (err) {
					res.status(500);
					res.json({
						code : 2,
						message : 'DB error'
					});
				} else if (results.length == 0) {
					res.status(404);
					res.json({
						code : 3,
						message : 'no such a datum'
					});
				} else {
					res.json({
						code : 0,
						data : {
							id : results[0].id,
							content : JSON.parse(results[0].content)
						}
					});
				}
			});
			break;
		case 'get_file':
			var sql = 'SELECT * FROM `files` WHERE `files`.`id` = ?';
			var query = DB.getConnection().query(sql, [req.body.file_id], function(err, results) {
				if (err) {
					res.status(500);
				} else if (results.length == 0) {
					res.status(404);
				} else {
					res.end(results[0].content, 'binary');
				}
			});
			break;
		default:
			res.json({
				code : 1,
				message : 'no command'
			});
	}
};