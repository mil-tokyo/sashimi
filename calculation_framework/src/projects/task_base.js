var assert = require('assert');
var fs = require('fs');
var DB = require('../db');

var TaskBase = function() {
	// variables
	this.saving_count = 0;
	this.project = null;
	this.task_id = null;
	this.static_code_files = [];
	this.static_code = '';
	
	// methods
	this.block = function(callback) {
		if (!this.task_id || this.saving_count > 0) {
			setTimeout(function() { this.block(callback); }.bind(this), 1000);
		} else {
			var sql = 'SELECT COUNT(*) AS `tickets_not_finished_count` FROM `tickets` WHERE `tickets`.`task_id` = ? AND (`tickets`.`status` = "free" OR `tickets`.`status` = "calculating");';
			var query = DB.getConnection().query(sql, [this.task_id], function(err, results) {
				assert.ifError(err);
				if (results[0].tickets_not_finished_count > 0) {
					process.stdout.write(results[0].tickets_not_finished_count + '..');
					setTimeout(function() { this.block(callback); }.bind(this), 1000);
				} else {
					console.log('all tickets have been done');
					var sql = 'SELECT `tickets`.`input`, `tickets`.`output` FROM `tickets` WHERE `tickets`.`task_id` = ? AND `tickets`.`status` = "finished"';
					var query = DB.getConnection().query(sql, [this.task_id], function(err, results) {
						assert.ifError(err);
						var tickets_to_callback = [];
						for (var i = 0; i < results.length; i++) {
							tickets_to_callback.push({
								input : JSON.parse(results[i].input),
								output : JSON.parse(results[i].output)
							});
						}
						var sql = 'UPDATE `tickets` SET `tickets`.`status` = "reduced" WHERE `tickets`.`task_id` = ?';
						var query = DB.getConnection().query(sql, [this.task_id], function(err, results) {
							assert.ifError(err);
							this.task_id = null;
						}.bind(this));
						callback(tickets_to_callback);
					}.bind(this));
				}
			}.bind(this));
		}
	};
	this.forEachTicketFinished = function(callback, finish_callback) {
		if (!this.task_id || this.saving_count > 0) {
			setTimeout(function() { this.forEachTicketFinished(callback, finish_callback); }.bind(this), 1000);
		} else {
			var sql = 'SELECT COUNT(*) AS `tickets_count` FROM `tickets` WHERE `tickets`.`task_id` = ? AND `tickets`.`status` != "reduced";';
			var query = DB.getConnection().query(sql, [this.task_id], function(err, results) {
				assert.ifError(err);
				if (results[0].tickets_count > 0) {
					var sql = 'SELECT `tickets`.`id`, `tickets`.`input`, `tickets`.`output` FROM `tickets` WHERE `tickets`.`task_id` = ? AND `tickets`.`status` = "finished"';
					var query = DB.getConnection().query(sql, [this.task_id], function(err, results) {
						assert.ifError(err);
						if (results.length == 0) {
							// no tickets are finished
							setTimeout(this.forEachTicketFinished.bind(this, callback, finish_callback), 100);
						} else {
							var tickets_to_callback = [];
							var tickets_ids_to_set_reduced = [];
							for (var i = 0; i < results.length; i++) {
								tickets_to_callback.push({
									input : JSON.parse(results[i].input),
									output : JSON.parse(results[i].output)
								});
								tickets_ids_to_set_reduced.push(results[i].id);
							}
							// remove tickets
							var sql = 'UPDATE `tickets` SET `tickets`.`status` = "reduced" WHERE `tickets`.`id` IN (?)';
							var query = DB.getConnection().query(sql, [tickets_ids_to_set_reduced], function(err, results) {
								assert.ifError(err);
								// callback
								for (var i = 0; i < tickets_to_callback.length; i++) {
									callback(tickets_to_callback[i]);
								}
								setTimeout(this.forEachTicketFinished.bind(this, callback, finish_callback), 100);
							}.bind(this));
						}
					}.bind(this));
				} else {
					console.log('all tickets have been done');
					finish_callback();
				}
			}.bind(this));
		}
	};
	this.run = function(input, output) {
		throw "A task class does not implement run function.";
	};
	this.calculate = function(inputs, static_codes_read_count) {
		// create task
		if (!this.task_id) {
			// load static code files
			if (typeof static_codes_read_count === 'undefined') {
				static_codes_read_count = 0;
			}
			if (this.static_code_files.length > static_codes_read_count) {
				fs.readFile('./static_codes/' + this.static_code_files[static_codes_read_count] + '.js', 'utf8', function (err, text) {
					assert.ifError(err);
					this.static_code += text;
					this.static_code += '\r\n';
					this.calculate(inputs, static_codes_read_count + 1);
				}.bind(this));
				return;
			}
			
			var sql = 'INSERT INTO `tasks` (`project_id`, `code`, `static_code`, `created`) VALUES (?, ?, ?, NOW());';
			this.saving_count++;
			var query = DB.getConnection().query(sql, [this.project_id, this.run.toString(), this.static_code], function(err, results) {
				assert.ifError(err);
				this.task_id = results.insertId;
				this.calculate(inputs, static_codes_read_count);
				this.saving_count--;
			}.bind(this));
			return;
		}
				
		// create tickets
		for (var i = 0; i< inputs.length; i++) {
			var sql = 'INSERT INTO `tickets` (`task_id`, `input`, `created`, `modified`) VALUES (?, ?, NOW(), NOW());';
			this.saving_count++;
			var query = DB.getConnection().query(sql, [this.task_id, JSON.stringify(inputs[i])], function(err, results) {
				assert.ifError(err);
				this.saving_count--;
			}.bind(this));
		}
	}
	this.setProjectId = function(project_id) {
		this.project_id = project_id;
	}
	
	// constructor
}

module.exports = TaskBase;