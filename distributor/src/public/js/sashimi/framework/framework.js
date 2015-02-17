Sashimi.Framework = function(host, port) {
	// variables
	this.host = null;
	this.port = null;
	this.ws = null;
	this.tasks = {};
	this.tickets = [];
	this.ticket_executor = null;
	this.task_loaded = 0;
	this.ticket_finished = 0;
	this.log_buffer = [];
	this.task_reload_max = 100;
	
	// methods
	this.connectServer = function() {
		this.ws = new WebSocket('ws://' + this.host + ':' + this.port + '/');
		this.ws.onerror = function(e) {
			this.log('Failed to Connect Server.', true);
		}.bind(this);
		this.ws.onopen = function() {
			this.setInformation();
			this.requestTicket();
		}.bind(this);
		this.ws.onclose = function(event) {
			this.log('Connection Closed. Retrying...', true);
			this.ws = null;
			setTimeout(this.connectServer.bind(this), 3000);
		}.bind(this);
		this.ws.onmessage = function(event) {
			var data = JSON.parse(event.data);
			switch (data.type) {
				case 'task':
					this.task_loaded++;
					this.tasks[data.task.task_id] = data.task;
					try {
						this.tasks[data.task.task_id].code = eval("(" + data.task.code + ")");
					} catch (e) {
						this.reportError('code', e);	
					}
					try {
						("global", eval)(data.task.static_code);
					} catch (e) {
						this.reportError('static_code', e);
					}
					this.executeTicket();
					break;
				case 'ticket':
					this.tickets.push(data.ticket);
					this.executeTicket();
					break;
				case 'result_accepted':
					this.ticket_finished++;
					if (this.task_loaded === this.task_reload_max) {
						location.reload();
						return;
					}
					this.requestTicket();
					break;
				case 'report_accepted':
					location.reload();
					// this.requestTicket();
					break;
				case 'run_code':
					eval(data.code_to_run);
					break;
				default:
					break;
			}
			this.log(data.message, !!data.code);
		}.bind(this);
	};
	
	this.setInformation = function() {
		this.ws.send(JSON.stringify({
			command : 'set_information',
			information : {
				browser : navigator.appName,
				browser_version : navigator.appVersion,
				language : navigator.language,
				user_agent : navigator.userAgent,
				referrer : document.referrer,
				screen_width : screen.width,
				screen_height : screen.height,
				screen_color_depth : screen.colorDepth
			}
		}));
	};
	
	this.requestTicket = function() {
		this.ws.send(JSON.stringify({
			command : 'get_ticket'
		}));
	};
	
	this.executeTicket = function() {
		if (this.ticket_executor) { 
			return;
		}
		this.log('start calculation');
		// check task
		var ticket_tmp = this.tickets[0];
		if (typeof this.tasks[ticket_tmp.task_id] === 'undefined') {
			this.ws.send(JSON.stringify({
				command : 'get_task',
				task_id : ticket_tmp.task_id
			}));
			return;
		}
		
		// start calculation
		var ticket_to_execute = this.tickets.shift();
		var task = this.tasks[ticket_to_execute.task_id];
		if (typeof Sashimi.project_data[task.project_id] === 'undefined') {
			Sashimi.project_data[task.project_id] = {};
		}
		var project = Sashimi.project_data[task.project_id];
		this.ticket_executor = new Sashimi.Framework.TicketExecutor(project, task, ticket_to_execute.ticket_id, task.code);
		
		var input = ticket_to_execute.input;
		try {
			this.ticket_executor.code(input, function(result) {
				// send result
				this.ticket_executor = null;
				this.ws.send(JSON.stringify(
					{
						command : 'set_result',
						ticket_id : ticket_to_execute.ticket_id,
						result : result
					}
				));
			}.bind(this));
		} catch (e) {
			this.reportError('code', e);
			this.ticket_executor = null;
		}
	};
	
	this.redraw = function() {
		$("#task_loaded").html(this.task_loaded);
		$("#ticket_finished").html(this.ticket_finished);
		setTimeout(this.redraw.bind(this), 1000);
	};
	
	this.log = function(str, error) {
		this.log_buffer.push({ time : new Date(), message : str, error : error });
		if (this.log_buffer.length > 20) {
			this.log_buffer.shift();
		}
		var html = '';
		for (var i = 0; i < this.log_buffer.length; i++) {
			if (this.log_buffer[i].error) {
				html += '<p class="log error">' + this.log_buffer[i].time.toLocaleString() + ' : ' + this.log_buffer[i].message + '</p>';
			} else {
				html += '<p class="log">' + this.log_buffer[i].time.toLocaleString() + ' : ' + this.log_buffer[i].message + '</p>';
			}
		}
		$("#console").html(html);
	};
	
	this.reportError = function(type, e) {
		console.log(type);
		console.trace(e);
		this.log('error occurred. reporting', true);
		this.ws.send(JSON.stringify(
			{
				command : 'report_error',
				type : type,
				ticket_id : this.ticket_executor ? this.ticket_executor.ticket_id : this.tickets[0].ticket_id,
				message : e.message,
				stack : e.stack
			}
		));
	};
	
	// constructor
	this.host = host;
	this.port = port;
	this.connectServer();
	this.redraw();
	window.onerror = function(message, url, line_number) {
		this.reportError('code', new Error(message + '\r\n' + 'url : ' + url + '\r\n' + 'line : ' + line_number));
		return true;
    }.bind(this);
};