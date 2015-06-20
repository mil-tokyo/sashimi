var TaskBase = require('../task_base');
var SmallPiTask = function() {
	this.static_code_files = [];
};
SmallPiTask.prototype = new TaskBase();
SmallPiTask.prototype.run = function(input, output) {
        var n_points = input.n_points | 0;
        var n_points_in_circle = 0;
        var n_points_out_circle = 0;
        for (var i = 0; i < n_points; i++) {
                var x = Math.random();
                var y = Math.random();
                if (x * x + y * y < 1.0) {
                        n_points_in_circle++;
                } else {
                        n_points_out_circle++;
                }
        }

        output({n_points_in_circle:n_points_in_circle,
                n_points_out_circle:n_points_out_circle});
};

module.exports = SmallPiTask;
