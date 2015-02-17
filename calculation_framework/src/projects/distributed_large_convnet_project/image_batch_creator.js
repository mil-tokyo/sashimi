var fs = require('fs');
var request = require('request');

require('../../static_codes/sushi/src/sushi');
require('../../static_codes/sushi/src/sushi_cl');
var $M = Sushi.Matrix;
var getPixels = require('get-pixels');

var ImageBatchCreator = function(urls, labels, classes, size) {
	this.urls = urls;
	this.labels = labels;
	this.classes = classes;
	this.size = size;
};

ImageBatchCreator.prototype.load = function(callback) {
	var images = new Array(this.urls.length);
	var count = 0;
	var labels = this.labels;
	process.stdout.write('loading images');
	
	for (var i = 0; i < this.urls.length; i++) {
		this.loadImage(this.urls[i], createCallback(i).bind(this), createErrorCallback(i).bind(this));
	}
	
	function createCallback(index) {
		return function(image) {
			images[index] = image;
			loadFinished.call(this);
		};
	}
	
	function createErrorCallback(index) {
		return function() {
			images[index] = null;
			labels[index] = null;
			loadFinished.call(this);
		};
	}
	
	function loadFinished() {
		if (++count < images.length) {
			process.stdout.write('.');
			return;
		}
		console.log('done');
		for (var i = images.length - 1; i >= 0; i--) {
			if (!images[i]) {
				images.splice(i, 1);
				labels.splice(i, 1);
			}
		}
		if (images.length === 0) {
			callback(null, null);
			return;
		}
		var image_batch = new $M(this.size.width * this.size.height * 3, images.length);
		var label_batch = new $M(this.classes, images.length);
		label_batch.largeZeros();
		image_batch.syncData();
		label_batch.syncData();
		for (var i = 0; i < images.length; i++) {
			var image_batch_offset = i;
			for (var j = 0; j < images[i].length; j++) {
				image_batch.data[image_batch_offset] = images[i][j];
				image_batch_offset += images.length;
			}
			label_batch.data[labels[i] * images.length + i] = 1;
		}
		callback(image_batch, label_batch, labels);	
	}
}

ImageBatchCreator.prototype.loadImage = function(url, callback, error_callback) {
	var image = new Array(this.size.width * this.size.height * 3);
	getPixels(
		url,
		function(err, pixels) {
			if (err) {
				error_callback(err);
			} else {
				var i = 0;
				var sum = 0;
				var col_ratio = pixels.shape[0] / this.size.width;
				var row_ratio = pixels.shape[1] / this.size.height;
				var col_block = Math.ceil(col_ratio);
				var row_block = Math.ceil(row_ratio);
				for (var depth = 0; depth < 3; depth++) {
					for (var row = 0; row < this.size.height; row++) {
						for (var col = 0; col < this.size.width; col++) {
							var tmp = 0;
							var cnt = 0;
							var x_base = Math.floor(col * col_ratio);
							var y_base = Math.floor(row * row_ratio);
							for (var y = 0; y < row_block; y++) {
								for (var x = 0; x < col_block; x++) {
									tmp += pixels.get(x_base + x, y_base + y, depth);
									cnt++;
								}
							}
							if (isNaN(tmp)) {
								error_callback('isNan');
								return;
							}
							var pixel_val = tmp / cnt / 255;
							sum += pixel_val;
							image[i++] = pixel_val;
						}
					}
				}
				if (sum < this.size.width * this.size.height * 3 * 0.01 || sum > this.size.width * this.size.height * 3 * 0.99) {
					error_callback('all black or all white');
					return;
				}
				callback(image);
			}
		}.bind(this)
	);
}

module.exports = ImageBatchCreator;