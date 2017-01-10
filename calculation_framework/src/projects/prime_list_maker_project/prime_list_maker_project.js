var ProjectBase = require('../project_base');
var IsPrimeTask = require('./is_prime_task');
var PrimeListMakerProject = function() {
	this.name = 'PrimeListMakerProject';
	this.run = function() {
		var task = this.createTask(IsPrimeTask);
		var inputs = [];
		for (var i = 1; i <= 1000; i++) {
			inputs.push({ candidate : i });
		}
		console.log('distributing tickets to clients');
		task.calculate(inputs);
		console.log('waiting all tickets to be finished');
		task.block(function(results) {
			console.log('all tickets have been finished');
			for (var i = 0; i < results.length; i++) {
				if (results[i].output.is_prime) {
					console.log(results[i].input.candidate + ' is a prime number.');
				}
			}
		});
	};
};
PrimeListMakerProject.prototype = new ProjectBase();

module.exports = PrimeListMakerProject;
