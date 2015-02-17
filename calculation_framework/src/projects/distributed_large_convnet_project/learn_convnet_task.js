var TaskBase = require('../task_base');

var LearnConvnetTask = function() {	
	// variables
	this.static_code_files = [
		'sushi/src/sushi', 'sushi/src/sushi_cl',
		'sukiyaki/bin/sukiyaki',
		'web_image'
	];
	
	// methods
	this.run = function(input, output) {	
		var onError = function(error) {
			console.error(error);
			output({
				batch_size : 0
			});
			return;
		}
		loadImages(input.urls, input.labels, input.image_size, input.proxy_prefix, function(images, labels) {
			createBatch(images, labels, input.image_size, input.classes, onError, function(batch) {
				loadModel(input.model_datum_id, function(model_data) {
					learnBatch(model_data.content, batch, input.learn_layers, labels, onError, output);
				});
			});
		});
		
		function loadImages(urls, labels, size, proxy_prefix, callback) {
			var count = 0;
			var images = [];
			var createErrorCallback = function(idx) {
				return function(params) {
					count++;
					images[idx] = null;
					labels[idx] = null;
					checkFinished();
				};
			};
			for (var i = 0; i < urls.length; i++) {
				var url = urls[i];
				if (proxy_prefix) {
					url = proxy_prefix + url;
				}
				if (url.indexOf('?') === -1) {
					url = url + '?randomtokenfornocache=' + (new Date()).getTime();
				} else {
					url = url + '&randomtokenfornocache=' + (new Date()).getTime();
				}
				images.push(
					WebImage.load(
						url,
						{ width : size.width, height : size.height },
						function() { count++; checkFinished(); },
						createErrorCallback(i),
						15 * 1000
					)
				);
			}
			function checkFinished() {
				if (count === images.length) {
					var new_images = notNullOnly(images);
					var new_labels = notNullOnly(labels);
					callback(new_images, new_labels);
				}
			}
			function notNullOnly(original) {
				var new_array = [];
				for (var i = 0; i < original.length; i++) {
					if (original[i] !== null) {
						new_array.push(original[i]);
					}
				}
				return new_array;
			}
		}
		
		function createBatch(images, labels, size, classes, onError, callback) {
			if (images.length === 0) {
				onError('images are zero');
				return;
			}
			var rows = size.height;
			var cols = size.width;
			var $M = Sushi.Matrix;
			var batch_size = images.length;
			var input = new $M(rows * cols * 3, batch_size);
			input.syncData();
			var output_batch = new $M(classes, batch_size);
			output_batch.largeZeros();
			output_batch.syncData();
			for (var i = 0; i < images.length; i++) {
				for (var row = 0; row < rows; row++) {
					for (var col = 0; col < cols; col++) {
						var color = images[i].get(col, row);
						input.data[((0 * rows + row) * cols + col) * batch_size + i] = color.r / 255;
						input.data[((1 * rows + row) * cols + col) * batch_size + i] = color.g / 255;
						input.data[((2 * rows + row) * cols + col) * batch_size + i] = color.b / 255;
					}
				}
				output_batch.data[labels[i] * images.length + i] = 1;
			}
			callback({
				input : input,
				output : output_batch
			});
		}
		
		function loadModel(model_datum_id, callback) {
			Sashimi.Framework.Utils.getDatum(model_datum_id, callback);
		}
		
		function learnBatch(model, batch, learn_layers, labels, onError, callback) {
			if (batch.input.cols === 0) {
				onError('batch_size is zero');
				return;
			}
			
			var sukiyaki = Sukiyaki.loadFromJson(model);
			
			sukiyaki.forward(batch.input);
			sukiyaki.backward(batch.output);
			
			var params = [];
			for (var i = learn_layers.from; i <= learn_layers.to; i++) {
				sukiyaki.layers[i].calculateUpdateParams();
				var param = {};
				if (sukiyaki.layers[i].delta_w) {
					param.delta_w = sukiyaki.layers[i].delta_w.toJSON();
				}
				if (sukiyaki.layers[i].delta_b) {
					param.delta_b = sukiyaki.layers[i].delta_b.toJSON();
				}
				params.push(param);
			}
			sukiyaki.release();
			batch.input.destruct();
			batch.output.destruct();
			callback({
				params : params,
				batch_size : batch.input.cols,
				learned : labels
			});
		}
	};
};

LearnConvnetTask.prototype = new TaskBase();

module.exports = LearnConvnetTask;
