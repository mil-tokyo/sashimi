var share = require('./share');

var MasterToWorker = function(worker) {
	// variables
	this.worker = null;
	
	// methods
	this.handleMessage = function(msg) {
		msg = JSON.parse(msg);
		switch(msg.command) {
			case 'get_connected_clients':
				worker.send(JSON.stringify({
					command : 'res_get_connected_clients',
					connected_clients : share.ticket_distributor.getConnectedClients()
				}));
				break;
			case 'run_code_on_clients':
				share.ticket_distributor.runCode(msg.code);
				break;
		}
	}.bind(this);
	
	// constructor
	this.worker = worker;
};

module.exports = MasterToWorker;