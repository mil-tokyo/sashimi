var WorkerToMaster = function() {
	// variables
	this.callbacks = {};
	
	// methods
	this.getClients = function(callback) {
		this.callbacks.get_connected_clients = callback;
		process.send(JSON.stringify({
			command : 'get_connected_clients'
		}));
	};
	
	this.runCodeOnClients = function(code) {
		process.send(JSON.stringify({
			command : 'run_code_on_clients',
			code : code
		}));
	};
	
	this.handleMessage = function(msg) {
		msg = JSON.parse(msg);
		switch(msg.command) {
			case 'res_get_connected_clients':
				if (this.callbacks.get_connected_clients) {
					this.callbacks.get_connected_clients(msg.connected_clients);
					this.callbacks.get_connected_clients = null;
				}
				break;
		}
	}.bind(this);
};

module.exports = WorkerToMaster;