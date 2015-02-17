var ProjectBase = require('../project_base');

require('../../static_codes/sushi/src/sushi');
require('../../static_codes/sushi/src/sushi_cl');
var $M = Sushi.Matrix;

require('../../static_codes/sukiyaki/bin/sukiyaki');

var LearnConvnetTask = require('./learn_convnet_task');
var ImageBatchCreator = require('./image_batch_creator');
var ImageUrlLoader = require('./image_url_loader');
var Validator = require('./validator');
var TrainBalancer = require('./train_balancer');
var Logger = require('./logger');

var fs = require('fs');

var DistributedLargeConvnetProject = function() {	
	this.name = 'DistributedLargeConvnetProject';
	this.logger = null;
	
	// training params
	this.urls_cache_file_name = './urls_cache.json';
//	this.pretrain_error_rate = 0.80;
	this.pretrain_error_rate = 0.99;
	this.learn_rate = 0.05;
	this.max_epoch = 10;
	
	this.image_width = 96;
	this.image_height = 96;

	this.distribute_batch_size = 20;
	this.distribute_size = 12;
	this.local_learn_batch_size = 30;
	
	// validation params
	this.validation_data_cache_file_name = './validation_data_cache.json';
	this.validation_batch_size = 50;
	this.validation_batch_num = 60;
	this.validation_data = [];
	
	// network params
	this.layers = [
		{ type : 'conv', params : { input_rows : 96, input_cols : 96, input_depth :  3, output_depth : 16, window_size : 5, padding : 2 } },
		{ type : 'act', params : { activation_type : 'relu' } },
		{ type : 'pool', params : { input_rows : 96, input_cols : 96, input_depth : 16, window_size : 3, stride : 1 } },
		
		{ type : 'conv', params : { input_rows : 94, input_cols : 94, input_depth : 16, output_depth : 20, window_size : 5, padding : 2 } },
		{ type : 'act', params : { activation_type : 'relu' } },
		{ type : 'pool', params : { input_rows : 94, input_cols : 94, input_depth : 20, window_size : 2, stride : 2 } },

		{ type : 'conv', params : { input_rows : 47, input_cols : 47, input_depth : 20, output_depth : 24, window_size : 5, padding : 2 } },
		{ type : 'act', params : { activation_type : 'relu' } },
		{ type : 'pool', params : { input_rows : 47, input_cols : 47, input_depth : 24, window_size : 3, stride : 2 } },
		
		{ type : 'conv', params : { input_rows : 23, input_cols : 23, input_depth : 24, output_depth : 28, window_size : 5, padding : 2 } },
		{ type : 'act', params : { activation_type : 'relu' } },
		{ type : 'pool', params : { input_rows : 23, input_cols : 23, input_depth : 28, window_size : 3, stride : 2 } },
		
		{ type : 'conv', params : { input_rows : 11, input_cols : 11, input_depth : 28, output_depth : 32, window_size : 5, padding : 2 } },
		{ type : 'act', params : { activation_type : 'relu' } },
		{ type : 'pool', params : { input_rows : 11, input_cols : 11, input_depth : 32, window_size : 3, stride : 2 } },
		
		{ type : 'fc', params : { input_size : 5 * 5 * 32, output_size : 10 } },
		{ type : 'act', params : { activation_type : 'softmax' } }
	];
	this.learn_layers = { from : 0, to : 14 };
	
	// classes to learn
	this.classes = [
		{ name : 'airplane', id : 'n02691156', full_children : false },
		{ name : 'automobile', id : 'n02958343', full_children : false },
		{ name : 'bird', id : 'n01503061', full_children : false },
		{ name : 'cat', id : 'n02121620', full_children : true },
		{ name : 'deer', id : 'n02430045', full_children : false },
		{ name : 'dog', id : 'n02084071', full_children : false },
		{ name : 'frog', id : 'n01639765', full_children : false },
		{ name : 'horse', id : 'n02374451', full_children : false },
		{ name : 'ship', id : 'n04194289', full_children : false },
		{ name : 'truck', id : 'n04490091', full_children : false }
	];
	
	this.run = function(){
		var run_cnt = 0;
		return function() {
			var functions = 
			[
			 	this.bench,
			 	this.initialize,
			 	this.getImageUrls,
			 	this.createValidationBatches,
			 	this.pretrain,
			 	this.mainLoop,
			 	this.bench
			];
			if (run_cnt == functions.length) {
				this.finishProject();
				return;
			};
			var retval = functions[run_cnt++].apply(this, arguments);
			if (retval !== undefined) {
				setImmediate(function() { this.run.apply(this, [retval]) }.bind(this));
			}
		};
	}();
	
	this.bench = function() {
		var start_time = null;
		return function() {
			if (!start_time) {
				start_time = new Date();
				console.log('start :')
				console.log(start_time.toLocaleString());
			} else {
				var finish_time = new Date();
				console.log('finish :')	
				console.log(finish_time.toLocaleString());
				console.log('elapsed time :')
				console.log((finish_time.getTime() - start_time.getTime()) + ' ms');
			}
			return 0;
		}
	}();
	
	this.initialize = function() {
		this.sukiyaki = new Sukiyaki(this.layers);
		for (var i = 0; i < this.sukiyaki.layers.length; i++) {
			this.sukiyaki.layers[i].learn_rate = this.learn_rate;
		}
		this.train_balancer_local = new TrainBalancer();
		this.train_balancer_distributed = new TrainBalancer();
		this.logger = new Logger();
		return 0;
	};
	
	this.getImageUrls = function() {
		var count = 0;
		return function() {
			// use cache
			if (fs.existsSync(this.urls_cache_file_name)) {
				console.log('use urls cache');
				this.classes = eval(fs.readFileSync(this.urls_cache_file_name, "utf8"));
				setTrainBalancerClasses.call(this);
				this.run();
				return;
			}
			
			// use no cache
			for (var i = 0; i < this.classes.length; i++) {
				var image_url_loader = new ImageUrlLoader(this.classes[i].id, this.classes[i].full_children);
				image_url_loader.getUrls(createCallback(i).bind(this), onError);
			}
			
			function createCallback(idx) {
				return function(urls) {
					this.classes[idx].urls = urls;
					console.log(this.classes[idx].name + ' : ' + urls.length + ' images in ImageNet');
					if (++count === this.classes.length) {
						// create cache
						console.log('start urls cache');
						fs.writeFile(this.urls_cache_file_name, JSON.stringify(this.classes), function() {
							console.log('urls cache finished');
						});
						setTrainBalancerClasses.call(this);
						this.run();
					}
				};
			}
			
			function onError(err) {
				throw new Error(err);
			}
			
			function setTrainBalancerClasses() {
				this.train_balancer_local.setClasses(this.classes);
				this.train_balancer_distributed.setClasses(this.classes);
			}
		};
	}();
	
	this.createValidationBatches = function() {
		// use cache
		if (fs.existsSync(this.validation_data_cache_file_name)) {
			console.log('use validation data cache');
			var load_data = eval(fs.readFileSync(this.validation_data_cache_file_name, "utf8"));
			for (var i = 0; i < load_data.length; i++) {
				this.validation_data.push({
					input : $M.fromJSON(load_data[i].input),
					labels : load_data[i].labels
				});
			}
			createValidator.call(this);
			return;
		}
		
		// use no cache
		var urls_per_class_and_batch = this.validation_batch_size / this.classes.length;
		
		for (var i = 0; i < this.classes.length; i++) {
			if (this.classes[i].urls < this.validation_batch_num * urls_per_class_and_batch) {
				throw new Error('The urls in ImageNet are not enough for validation');
			}
		}
		createValidationBatch.call(this);
		
		function createValidator() {
			this.validator = new Validator(this.sukiyaki, this.validation_data, this.classes);
			this.run();
			return;
		}
		
		function createValidationBatch() {
			if (this.validation_data.length === this.validation_batch_num) {
				var save_data = [];
				for (var i = 0; i < this.validation_data.length; i++) {
					save_data.push({
						input : this.validation_data[i].input.toJSON(),
						labels : this.validation_data[i].labels
					});
				}
				// create cache
				console.log('start validation cache');
				fs.writeFileSync(this.validation_data_cache_file_name, JSON.stringify(save_data));
				console.log('validation cache finished');
				createValidator.call(this);
				return;
			}
			var urls = [];
			var labels = [];
			for (var i = 0; i < this.classes.length; i++) {
				urls = urls.concat(this.classes[i].urls.splice(randInt(this.classes[i].urls.length - urls_per_class_and_batch), urls_per_class_and_batch));
				for (var j = 0; j < urls_per_class_and_batch; j++) {
					labels.push(i);
				}
			}
			var image_batch_creator = new ImageBatchCreator(urls, labels, this.classes.length, { width : this.image_width, height : this.image_height });
			image_batch_creator.load(function(image_batch, label_batch, labels) {
				if (image_batch !== null) {
					this.validation_data.push({
						input : image_batch,
						labels : labels
					});
				}
				createValidationBatch.call(this);
			}.bind(this));
			
			function randInt(max) {
				// integer [0, max]
				return Math.floor(Math.random() * (max + 1));
			}
		}
	};
	
	this.createDistributeInput = function(datum_id) {
		var urls_and_labels = this.train_balancer_distributed.getNextUrlsAndLabels(this.distribute_batch_size);
		return {
			model_datum_id : datum_id,
			urls : urls_and_labels.urls,
			labels : urls_and_labels.labels,
			image_size : { width : this.image_width, height : this.image_height },
			classes : this.classes.length,
			learn_layers : this.learn_layers,
//			proxy_prefix : 'http://simba:8080/'
		};
	};
	
	this.pretrain = function() {
		console.log('start pretraining');
		pretrainLearnLoop.call(this);
		
		function pretrainLearnLoop() {
			var status = this.validate();
			if (status.error_rate < this.pretrain_error_rate) {
				console.log('finsih pretrain');
				if (this.local_learn_batch_size_after_pretrain) {
					this.local_learn_batch_size = this.local_learn_batch_size_after_pretrain;
				}
				this.run();
				return;
			}
			this.learnNextBatch(true, function(learned_num) {
				console.log(learned_num + ' images were learned as pretraining');
				pretrainLearnLoop.call(this)
			}.bind(this));
		};
	};
	
	this.validate = function(callback) {
		this.validator.validate();
		var status = this.validator.getStatus();
		console.log('confusion matrix');
		status.confusion_matrix.print();
		console.log('error rate : ' + (status.error_rate * 100) + ' %');
		console.log('learned images (locally)');
		this.train_balancer_local.printLearned();
		console.log('learned images (distributedly)');
		this.train_balancer_distributed.printLearned();
		this.logger.log(status.error_rate * 100, this.train_balancer_local.learned, this.train_balancer_distributed.learned);
		return status;
	};
	
	this.learnNextBatch = function(all, callback) {
		// prepare batch to learn
		var urls_and_labels = this.train_balancer_local.getNextUrlsAndLabels(this.local_learn_batch_size);
		var urls = urls_and_labels.urls;
		var labels = urls_and_labels.labels;
		var image_batch_creator = new ImageBatchCreator(urls, labels, this.classes.length, { width : this.image_width, height : this.image_height });
		image_batch_creator.load(function(image_batch, label_batch, labels) {
			// start learn
			if (image_batch === null) {
				console.log('an error occurred while loading images');
				setTimeout(callback(0), 1000);
			} else {
				this.train_balancer_local.addLearned(labels);
				this.sukiyaki.forward(image_batch);
				this.sukiyaki.backward(label_batch);
				if (all) {
					this.sukiyaki.update();
				} else {
					for (var i = this.learn_layers.to + 1; i < this.sukiyaki.layers.length; i++) {
						this.sukiyaki.layers[i].calculateUpdateParams();
						this.sukiyaki.layers[i].update();
					}
				}
				// caluclate fitting_error
				if ($M.CL) {
					var square_sum = this.sukiyaki.calcSquareSum(this.sukiyaki.layers[this.sukiyaki.layers.length - 1].delta_output).largeTimes(1.0 / image_batch.cols);
				} else {
					var square_sum = this.sukiyaki.calcSquareSum(this.sukiyaki.layers[this.sukiyaki.layers.length - 1].delta_output) / image_batch.cols;
				}
				square_sum.syncData();
				console.log('fitting_error : ' + square_sum.data[0]);
				this.sukiyaki.release();

				image_batch.destruct();
				label_batch.destruct();
				callback(image_batch.cols);
			}
		}.bind(this));
	};

	this.epoch = 0;
	//this.local_learn_offsest = 0;
	this.mainLoop = function() {
		console.log('main loop : epoch #' + this.epoch++);
		
		tickets_finished = false;
		var params = [];
		var distributed_whole_batch_size = 0;
		var local_learn_image_num = 0;
		var task = this.createTask(LearnConvnetTask);
		this.addDatum(this.sukiyaki.saveToJson(), createTickets.bind(this));
		
		function createTickets(datum_id) {
			var inputs = [];
			for (var i = 0; i < this.distribute_size; i++) {
				inputs.push(this.createDistributeInput(datum_id));
			}
			if (inputs.length) {
				task.calculate(inputs);
				task.forEachTicketFinished(ticketCallback.bind(this), ticketFinishCallback.bind(this));
			} else {
				tickets_finished = true;
			}
			
			this.validate();
			localLearnLoop.call(this);
		}
		
		function ticketCallback(ticket) {
			var batch_size = ticket.output.batch_size;
			if (!batch_size) {
				return;
			}
			distributed_whole_batch_size += batch_size;
			if (!params.length) {
				for (var i = 0; i < ticket.output.params.length; i++) {
					params[i] = {};
					if (ticket.output.params[i].delta_w) {
						params[i].delta_w = $M.fromJSON(ticket.output.params[i].delta_w);
						params[i].delta_w.largeTimes(batch_size);
					}
					if (ticket.output.params[i].delta_b) {
						params[i].delta_b = $M.fromJSON(ticket.output.params[i].delta_b);
						params[i].delta_b.largeTimes(batch_size);
					}
				}
			} else {
				for (var i = 0; i < ticket.output.params.length; i++) {
					if (ticket.output.params[i].delta_w) {
						var tmp = $M.fromJSON(ticket.output.params[i].delta_w);
						tmp.largeTimes(batch_size);
						params[i].delta_w.largeAdd(tmp);
						tmp.destruct();
					}
					if (ticket.output.params[i].delta_b) {
						var tmp = $M.fromJSON(ticket.output.params[i].delta_b);
						tmp.largeTimes(batch_size);
						params[i].delta_b.largeAdd(tmp);
						tmp.destruct();
					}
				}
			}
			this.train_balancer_distributed.addLearned(ticket.output.learned);
		}
		
		function ticketFinishCallback() {
			for (var i = 0; i < params.length; i++) {
				if (params[i].delta_w) {
					params[i].delta_w.largeTimes(1 / distributed_whole_batch_size);
				}
				if (params[i].delta_b) {
					params[i].delta_b.largeTimes(1 / distributed_whole_batch_size);
				}
			}
			tickets_finished = true;
		}
		
		function finishOneMainLoop() {
			console.log(distributed_whole_batch_size + ' images distributedly and ' + local_learn_image_num + ' images locally were learned')
			for (var i = 0; i < params.length; i++) {
				if (params[i].delta_w || params[i].delta_b) {
					if (params[i].delta_w) {
						this.sukiyaki.layers[i].delta_w = params[i].delta_w;
					}
					if (params[i].delta_b) {
						this.sukiyaki.layers[i].delta_b = params[i].delta_b;
					}
					this.sukiyaki.layers[i].update();
				}
			}
			this.sukiyaki.release();
			this.mainLoop.call(this);
		}
		
		function localLearnLoop() {
			this.learnNextBatch(this.distribute_size === 0, function(learned_num) {
				local_learn_image_num += learned_num;
				if (tickets_finished) {
					finishOneMainLoop.call(this);
					return;
				}
				localLearnLoop.call(this)
			}.bind(this));
		};
	};
}

DistributedLargeConvnetProject.prototype = new ProjectBase();

module.exports = DistributedLargeConvnetProject;
