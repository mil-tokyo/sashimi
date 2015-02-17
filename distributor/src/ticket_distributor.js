var ws = require('websocket.io');
var assert = require('assert');
var ClientInformation = require('./client_information');
var DB = require('./db');

var TicketDistributor = function(port) {
	// variables
	this.server = null;
	this.clients = [];
	this.waiting_clients = [];
	
	// methods
	this.initServer = function(port) {
		this.server = ws.listen(port, function () {
			console.log('Websocket server listening on port ' + port);
		});
		this.server.on('connection', function(client) {
			var client_information = new ClientInformation(client);
			this.clients.push(client_information);
			client.on('message', function(data) {
				try {
					var data = JSON.parse(data);
				} catch (e) {
					var data = {};
				}
				var response = this.handleResponse(client_information, data);
				client_information.send(response);
			}.bind(this));
			client.on('close', function() {
				this.removeClientFromList(client_information);
			}.bind(this));
			client.on('error', function(err) {
				if (err.code == 'ECONNRESET') {
					this.removeClientFromList(client_information);
				} else {
					assert.ifError(err);
				}
			}.bind(this));
		}.bind(this));
		this.server.on('error', function(err) {
			console.log(err);
		});
	};

	this.removeClientFromList = function(client_information) {
		for (var i = 0; i < this.clients.length; i++) {
			if (this.clients[i] == client_information) {
				this.clients.splice(i, 1);
			}
		}
		this.removeClientFromWaitingList(client_information);
	};
	
	this.removeClientFromWaitingList = function(client_information) {
		for (var i = 0; i < this.waiting_clients.length; i++) {
			if (this.waiting_clients[i] == client_information) {
				this.waiting_clients.splice(i, 1);
			}
		}
	};
	
	this.handleResponse = function(client_information, data) {
		var response = {};
		switch (data.command) {
			case 'set_information':
				client_information.setInformation(data.information);
				response.message = 'information accepted';
				break;
			case 'get_ticket':
				this.waiting_clients.push(client_information);
				response.message = 'ticket will be distributed to you when available';
				break;
			case 'get_task':
				this.sendTask(client_information, data.task_id);
				response.message = 'task will be distributed';
				break;
			case 'set_result':
				this.setResult(data.ticket_id, data.result);
				response.type = 'result_accepted';
				response.message = 'result accepted';
				break;
			case 'report_error':
				this.saveErrorReport(data.ticket_id, data.type, data.message, data.stack);
				response.type = 'report_accepted';
				response.message = 'error report accepted';
				break;
			default:
				response.code = 1;
				response.message = 'invalid command';
				break;
		}
		return response;
	};
	
	this.setResult = function(ticket_id, result) {
		var sql = 'UPDATE `tickets` SET `tickets`.`status` = "finished", `tickets`.`output` = ?, `tickets`.`modified` = NOW() WHERE `tickets`.`id` = ? AND `tickets`.`status` = "calculating";';
		var query = DB.getConnection().query(sql, [JSON.stringify(result), ticket_id], function(err, results) {
			assert.ifError(err);
		}.bind(this));
	};
	
	this.saveErrorReport = function(ticket_id, type, message, stack) {
		console.log('catched error report.');
		var sql = 'INSERT INTO `error_reports` SET `error_reports`.`ticket_id` = ?, `error_reports`.`type` = ?, `error_reports`.`message` = ?, `error_reports`.`stack` = ?, `error_reports`.`created` = NOW();';
		var query = DB.getConnection().query(sql, [ticket_id, type, message, stack], function(err, results) {
			assert.ifError(err);
		}.bind(this));
	}
	
	this.sendTask = function(client_information, task_id) {
		var sql = 'SELECT `tasks`.`id`, `tasks`.`static_code`, `tasks`.`code`, `tasks`.`project_id` FROM `tasks` WHERE `tasks`.`id` = ?';
		var query = DB.getConnection().query(sql, [task_id], function(err, results) {
			assert.ifError(err);
			if (results.length == 0) {
				setTimeout(function() {this.sendTask(client_information, task_id)}.bind(this), 1000);
				return;
			} else {
				client_information.send(
					{
						type : 'task',
						message : 'task distributed',
						task : {
							task_id : results[0].id,
							static_code : results[0].static_code,
							code : results[0].code,
							project_id : results[0].project_id
						}
					}
				);
			}
		}.bind(this));
	};
	
	this.getAndDistributeTickets = function() {
		var cache_tickets = [];
		var cache_time = new Date();
		
		var distributeTicketsToClients = function() {
			// distribute tickets to clients
			console.log(cache_tickets.length + ' tickets will be distributed to ' + this.waiting_clients.length + ' clients');
			var distributed_ticket_ids = [];
			while(cache_tickets.length > 0 && this.waiting_clients.length > 0){
				var ticket = cache_tickets.shift();
				this.waiting_clients.shift().send(
					{
						type : 'ticket',
						message : 'ticket distributed',
						ticket : {
							task_id : ticket.task_id,
							ticket_id : ticket.id,
							input : JSON.parse(ticket.input)
						}
					}
				);
				distributed_ticket_ids.push(ticket.id);
			}
			// set tickets as distributed
			var sql = 'UPDATE `tickets` SET `tickets`.`status` = "calculating", `tickets`.`modified` = NOW() WHERE `tickets`.`id` IN (?) AND (`tickets`.`status` = "free" OR `tickets`.`status` = "calculating")';
			var query = DB.getConnection().query(sql, [distributed_ticket_ids], function(err, results) {
				setImmediate(this.getAndDistributeTickets.bind(this));
			}.bind(this));
		};
		
		return function() {
			if (this.waiting_clients.length == 0) {
				setImmediate(this.getAndDistributeTickets.bind(this));
				return;
			};
			if (new Date() - cache_time > 1000 * 10) {
				// cache is best before 10 seconds from selection
				cache_tickets = [];
			}
			if (cache_tickets.length < this.waiting_clients.length) {
				var cache_ticketsCountAtOnce = 100;
				var sql =
					'SELECT ' +
						'`tickets`.`id`, ' +
						'`tickets`.`task_id`, ' +
						'`tickets`.`input`, ' +
						'`tickets`.`status`, ' +
						'CASE `tickets`.`status` ' +
							'WHEN "free" THEN `tickets`.`created` ' +
							'WHEN "calculating" THEN `tickets`.`modified` + INTERVAL 5 MINUTE END ' +
						'AS `virtual_created` ' +
					'FROM `tickets` ' +
					'LEFT JOIN `tasks` ON `tasks`.`id` = `tickets`.`task_id` ' +
					'WHERE ' +
						'`tickets`.`status` = "free" OR ' +
						'(`tickets`.`status` = "calculating" AND `tickets`.`modified` + INTERVAL 10 SECOND < NOW()) ' +
					'ORDER BY `virtual_created` ' +
					'LIMIT ?';
				var query = DB.getConnection().query(sql, [cache_ticketsCountAtOnce], function(err, results) {
					assert.ifError(err);
					cache_tickets = cache_tickets.concat(results);
					cache_time = new Date();
					if (cache_tickets.length == 0) {
						console.log('No tickets available.');
						setTimeout(this.getAndDistributeTickets.bind(this), 1000);
					} else {
						distributeTicketsToClients.call(this);
					}
				}.bind(this));
			} else {
				distributeTicketsToClients.call(this);
			}
		};
	}();
	
	this.startMonitoringDatabase = function() {
		setImmediate(this.getAndDistributeTickets.bind(this));
	};
	
	this.getConnectedClients = function() {
		var information = [];
		for (var i = 0; i < this.clients.length; i++) {
			information.push(this.clients[i].getInformation());
		}
		return information;
	};
	
	this.runCode = function(code) {
		for (var i = 0; i < this.clients.length; i++) {
			this.clients[i].send(
				{
					type : 'run_code',
					message : 'do the code',
					code_to_run : code
				}
			);
		}
	};
	
	// constructor
	this.initServer(port);
	this.startMonitoringDatabase();
};

module.exports = TicketDistributor;