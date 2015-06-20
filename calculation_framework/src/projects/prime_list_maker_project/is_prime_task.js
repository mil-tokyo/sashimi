var TaskBase = require('../task_base');
var IsPrimeTask = function() {
	// calculation_framework/src/static_codes/is_prime.js
	this.static_code_files = ['is_prime'];
	this.run = function(input, output) {
		if (is_prime(input.candidate)) {
			output({ is_prime : true });
		} else {
			output({ is_prime : false });
		}
	};
};
IsPrimeTask.prototype = new TaskBase();
module.exports = IsPrimeTask;
