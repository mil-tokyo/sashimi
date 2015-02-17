var log4js = require('log4js');

var Logger = function() {
	log4js.loadAppender('file');
	
	log4js.addAppender(log4js.appenders.file('logs/experiment_data_' + (new Date()).getTime() + '.csv'), 'experiment_data');
	this.logger = log4js.getLogger('experiment_data');
	
	var log_line = [
		'time',
		'timestamp',
		'error_rate'
	];
	for (var i = 0; i < 10; i++) {
		log_line.push('learned_locally_' + i);
	}
	for (var i = 0; i < 10; i++) {
		log_line.push('learned_distributedly_' + i);
	}
	this.logger.trace(',' + log_line.join(','));
};

Logger.prototype.log = function(error_rate, learned_locally, learned_distributedly) {
	var log_line = [];
	log_line.push((new Date()).toString());
	log_line.push((new Date()).getTime());
	log_line.push(error_rate);
	log_line = log_line.concat(learned_locally);
	log_line = log_line.concat(learned_distributedly);
	this.logger.trace(',' + log_line.join(','));
};

module.exports = Logger;