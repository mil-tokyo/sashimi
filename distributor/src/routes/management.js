var assert = require('assert');
var config = require('config');
var DB = require('../db');
var share = require('../share');

exports.index = function(req, res) {
	res.render('management/index', {
		title : 'Sashimi - Management',
		page : 'management'
	});
};

exports.run_code = function(req, res) {
	share.worker_to_master.runCodeOnClients(req.body.code);
	res.json({
		result : "ok"
	});
};

exports.kill_project = function(req, res) {
	var sql = 'DELETE FROM `projects` WHERE `projects`.`id` = ?';
	var query = DB.getConnection().query(sql, [req.body.project_id], function(err, results) {
		if (err) {
			res.json({
				result : "error ocurred"
			});	
		} else {
			res.json({
				result : "ok"
			});	
		}
	}.bind(this));
};

exports.ongoing_projects = function(req, res) {
	var sql =
		'SELECT ' +
			'`projects`.`id`, `projects`.`name`, `projects`.`created`, ' +
			'`project_task_ticket_statistics`.`tasks_count`, ' +
			'`project_task_ticket_statistics`.`free_tickets_count`, ' +
			'`project_task_ticket_statistics`.`calculating_tickets_count`, ' +
			'`project_task_ticket_statistics`.`finished_tickets_count`, ' +
			'`project_task_ticket_statistics`.`reduced_tickets_count`, ' +
			'`project_error_reports_statistics`.`error_reports_count` ' +
		'FROM `projects` ' +
		'LEFT JOIN ' +
			'`project_task_ticket_statistics` ON `project_task_ticket_statistics`.`project_id` = `projects`.`id` ' +
		'LEFT JOIN ' +
			'`project_error_reports_statistics` ON `project_error_reports_statistics`.`project_id` = `projects`.`id` ' +
		'GROUP BY `projects`.`id`';
	var query = DB.getConnection().query(sql, [], function(err, results) {
		assert.ifError(err);
		res.render('management/ongoing_projects', {
			projects : results,
		});
	});
};

exports.connected_clients_num = function(req, res) {
	share.worker_to_master.getClients(function(clients) {
		res.json({
			num : clients.length
		});
	});
};

exports.connected_clients = function(req, res) {
	share.worker_to_master.getClients(function(clients) {
		res.render('management/connected_clients', {
			connected_clients : clients
		});
	});
};