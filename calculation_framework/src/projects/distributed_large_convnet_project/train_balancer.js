var TrainBalancer = function() {
	this.class_offset = 0;
};

TrainBalancer.prototype.setClasses = function(classes) {
	this.classes = classes;
	this.offsets = [];
	this.learned = [];
	this.tmp_learned = [];
	for (var i = 0; i < this.classes.length; i++) {
		this.offsets[i] = 0;
		this.learned[i] = 0;
		this.tmp_learned[i] = 0;
	}
}

TrainBalancer.prototype.addLearned = function(learned) {
	for (var i = 0; i < learned.length; i++) {
		this.learned[learned[i]]++;
	}
	for (var i = 0; i < this.classes.length; i++) {
		this.tmp_learned[i] = this.learned[i];
	}
};

TrainBalancer.prototype.printLearned = function() {
	console.log(this.learned.join(', '));
};

TrainBalancer.prototype.getNextUrlsAndLabels = function(num) {
	var urls = [];
	var labels = [];
	
	var max_learned = this.tmp_learned[0];
	var min_class = 0;
	for (var i = 1; i < this.classes.length; i++) {
		max_learned = (max_learned < this.tmp_learned[i]) ? this.tmp_learned[i] : max_learned;
		min_class = (this.tmp_learned[i] < this.tmp_learned[min_class]) ? i : min_class;
	}
	
	// fill supplementarily
	SUPPLEMENTARILY:
	for (var i = 0; i < this.classes.length; i++) {
		var target = (min_class + i) % this.classes.length;
		for (var j = this.tmp_learned[target]; j < max_learned; j++) {
			if (urls.length === num) {
				break SUPPLEMENTARILY;
			}
			urls.push(this.classes[target].urls[this.offsets[target]]);
			labels.push(target);
			this.offsets[target] = ++this.offsets[target] % this.classes[target].urls.length;
			this.tmp_learned[target]++;
		}
	}
	
	// fill by rotation
	for (var i = 0; urls.length < num; i++) {
		var target = (this.class_offset + i) % this.classes.length;
		urls.push(this.classes[target].urls[this.offsets[target]]);
		labels.push(target);
		this.offsets[target] = ++this.offsets[target] % this.classes[target].urls.length;
		this.tmp_learned[target]++;
	}
	this.class_offset += (num - urls.length);
	
	return {
		urls : urls,
		labels : labels
	};
};

module.exports = TrainBalancer;