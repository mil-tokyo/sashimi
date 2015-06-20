var ProjectBase = require('../project_base');
var SmallPiTask = require('./small_pi_task');
var MontecarloPiProject = function() {
	this.name = 'MontecarloPiProject';
        this.sum_in_circle = 0;
        this.sum_out_circle = 0;
};
MontecarloPiProject.prototype = new ProjectBase();

MontecarloPiProject.prototype.run = function() {
        var self = this;
	var task = this.createTask(SmallPiTask);
	var inputs = [];
        var n_tickets = 20;
        var n_points_per_ticket = 10000000;
	for (var i = 0; i < n_tickets; i++) {
		inputs.push({ n_points : n_points_per_ticket });
	}
//	console.log('distributing tickets to clients');
	task.calculate(inputs);
//	console.log('waiting all tickets to be finished');
	task.block(function(results) {
		for (var i = 0; i < results.length; i++) {
                        self.sum_in_circle += results[i].output.n_points_in_circle;
                        self.sum_out_circle += results[i].output.n_points_out_circle;
		}
                var pi = self.sum_in_circle / (self.sum_in_circle + self.sum_out_circle) * 4;
                console.log('total points = ' + (self.sum_in_circle + self.sum_out_circle));
                console.log('estimated pi = ' + pi);
                console.log('difference to true pi = ' + (pi - Math.PI).toExponential(2));
                setTimeout(self.run.bind(self), 1);
	});
};

module.exports = MontecarloPiProject;
