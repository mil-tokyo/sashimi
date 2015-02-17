var client_informations = [];

var ClientInformation = function(client) {
	// variables
	this.client = null;
	this.created = null;
	this.information = null;
	
	// methods
	this.send = function(data) {
		data.time = (new Date()).toLocaleString();
		if (typeof data.type === 'undefined') {
			data.type = 'message';
		}
		if (typeof data.code === 'undefined') {
			data.code = 0;
		}
		if (typeof data.message === 'undefined') {
			data.message = 0;
		}
		this.client.send(JSON.stringify(data));
	};
	this.setInformation = function(information) {
		this.information = information;
	};
	this.getInformation = function() {
		return this.information;
	};
	
	// constructors
	this.client = client;
	this.created = new Date();
};

module.exports = ClientInformation;