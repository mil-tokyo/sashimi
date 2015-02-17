require('../../static_codes/sushi/src/sushi');
require('../../static_codes/sushi/src/sushi_cl');
var $M = Sushi.Matrix;

var Validator = function(sukiyaki, validation_data, classes) {
	this.sukiyaki = sukiyaki;
	this.validation_data = validation_data;
	this.classes = classes;
	
	this.batch_offset = 0;
	this.results = [];
	this.confusion_mat = new $M(classes.length, classes.length);
	this.confusion_mat.syncData();
	this.correct = 0;
	
	this.result_max = 3000;
	this.validate_batch_per_once = 10;
};

Validator.prototype.getStatus = function() {
	return {
		correct : this.correct,
		all_results : this.results.length,
		error_rate : 1.0 - this.correct / this.results.length,
		confusion_matrix : this.confusion_mat
	}
};

Validator.prototype.validate = function() {
	for (var i = 0; i < this.validate_batch_per_once; i++) {
		// predict
		var predicts = this.sukiyaki.predict(this.validation_data[this.batch_offset].input);
		predicts.syncData();
		var labels = this.validation_data[this.batch_offset].labels;
		// aggregate and update confusion matrix
		for (var j = 0; j < labels.length; j++) {
			var predict = predicts.data[j];
			var answer = labels[j];
			if (answer === predict) {
				this.correct++;
			}
			this.confusion_mat.data[answer * 10 + predict]++;
			this.results.push({ answer : answer, predict : predict });
		}
		this.batch_offset++;
		this.batch_offset %= this.validation_data.length;
		predicts.destruct();
	}
	
	while (this.results.length > this.result_max) {
		var result = this.results.shift();
		if (result.answer === result.predict) {
			this.correct--;
		}
		this.confusion_mat.data[result.answer * 10 + result.predict]--;
	}
};

module.exports = Validator;