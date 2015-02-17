var assert = require('assert');
var DB = require('../db');
var fs = require('fs');

var ProjectBase = function() {
	// variables
	this.name = null;
	this.project_id = null;

	// methods
	this.run = null;
	this.main = function() {
		var sql = 'INSERT INTO `projects` (`name`, `created`) VALUES (?, NOW());';
		var query = DB.getConnection().query(sql, [ this.name ], function(err, results) {
			assert.ifError(err);
			this.project_id = results.insertId;
			this.run();
		}.bind(this));
	};
	this.createTask = function(task_base) {
		var task = new task_base();
		task.setProjectId(this.project_id);
		return task;
	};
	this.finishProject = function() {
		var sql = 'DELETE FROM `projects` WHERE `projects`.`id` = ?';
		var query = DB.getConnection().query(sql, [this.project_id], function(err, results) {
			assert.ifError(err);
			process.exit();
		}.bind(this));
	};
	this.addDatum = function(content, callback) {
		var sql = 'INSERT INTO `data` (`project_id`, `content`, `created`) VALUES (?, ?, NOW());';
		var query = DB.getConnection().query(sql, [this.project_id, JSON.stringify(content)], function(err, results) {
			assert.ifError(err);
			callback(results.insertId);
		});
	};
	this.addFile = function(filename, callback) {
		fs.readFile(filename, function(err, file_bin) {
			assert.ifError(err);
			var sql = 'INSERT INTO `files` (`project_id`, `content`, `created`) VALUES (?, ?, NOW());';
			var query = DB.getConnection().query(sql, [this.project_id, file_bin], function(err, results) {
				assert.ifError(err);
				callback(results.insertId);
			});
		}.bind(this));
	};
}

module.exports = ProjectBase;