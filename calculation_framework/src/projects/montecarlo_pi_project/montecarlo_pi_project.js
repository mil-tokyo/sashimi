var ProjectBase = require('../project_base');
var SmallPiTask = require('./small_pi_task');
var MontecarloPiProject = function() {
	this.name = 'MontecarloPiProject';
};
MontecarloPiProject.prototype = new ProjectBase();

MontecarloPiProject.prototype.run = function() {
	var task = this.createTask(SmallPiTask);
	var sum_in_circle = 0;
	var sum_points = 0;
	var current_pi = 0;
	var iteration = function () {
	var inputs = [];
        var n_tickets = 20;
        var n_points_per_ticket = 100000;
	for (var i = 0; i < n_tickets; i++) {
		inputs.push({ n_points : n_points_per_ticket,
                              sum_points: sum_points,//displayed in client for demo
                              current_pi: current_pi});
	}
	console.log('distributing tickets to clients');
	task.calculate(inputs);
	console.log('waiting all tickets to be finished');
	task.block(function(results) {
		for (var i = 0; i < results.length; i++) {
                        sum_in_circle += results[i].output.n_points_in_circle;
                        sum_points += results[i].output.n_points_in_circle;
                        sum_points += results[i].output.n_points_out_circle;
		}
                current_pi = sum_in_circle / sum_points * 4;
                console.log('total points = ' + (sum_points));
                console.log('estimated pi = ' + current_pi);
                console.log('difference to true pi = ' + (current_pi - Math.PI).toExponential(2));
                setTimeout(iteration, 1);
	});
    }.bind(this);

    setTimeout(iteration, 1);
};

module.exports = MontecarloPiProject;
