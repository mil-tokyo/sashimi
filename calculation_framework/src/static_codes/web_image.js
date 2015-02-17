(function() {
	if (WebImage) {
		return;
	}
	var WebImage = function() {
		this.image = new Image();
		this.image.crossOrigin = 'anonymous';
		this.canvas = null;
		this.context = null;
		this.image_data = null;
		this.width = null;
		this.height = null;
		this.callback_done = false;
	};
	WebImage.load = function(url, size, onload, onerror, timeout) {
		var web_image = new WebImage();
		web_image.image.onload = function() {
			if (this.callback_done) { return; }
			this.callback_done = true;
			this.canvas = document.createElement('canvas');
			this.context = this.canvas.getContext('2d');
			if (size && size.width && size.height) {
				this.width = size.width;
				this.height = size.height;
			} else {
				this.width = this.image.width;
				this.height = this.image.height;
			}
			this.canvas.width = this.width;
			this.canvas.height = this.height;
			this.context.drawImage(this.image, 0, 0, this.width, this.height);
			this.image_data = this.context.getImageData(0, 0, this.width, this.height);
			onload();
		}.bind(web_image);
		web_image.image.onerror = function() {
			if (this.callback_done) { return; }
			this.callback_done = true;
			onerror();
		}.bind(web_image);
		if (timeout) {
			setTimeout(function() {
				if (!this.canvas) {
					this.image.src = "";
					if (this.callback_done) { return; }
					this.callback_done = true;
					onerror();
				}
			}.bind(web_image), timeout);
		}
		web_image.image.src = url;
		return web_image;
	};
	WebImage.prototype.get = function(x, y) {
		var offset = (x + y * this.width) * 4;
		return new Color(this.image_data.data[offset], this.image_data.data[offset + 1], this.image_data.data[offset + 2], this.image_data.data[offset + 3]);
	};
	WebImage.prototype.set = function(x, y, color) {
		var offset = (x + y * this.width) * 4;
		this.image_data.data[offset] = color.r;
		this.image_data.data[offset + 1] = color.g;
		this.image_data.data[offset + 2] = color.b;
		this.image_data.data[offset + 3] = color.a;
	};
	WebImage.prototype.getImageElement = function() {
		this.context.putImageData(this.image_data, 0, 0);
		var image = document.createElement('img');
		image.src = this.canvas.toDataURL();
		return image;
	};
	
	("global", eval)("this").WebImage = WebImage;
})();

(function() {
	if (Color) {
		return;
	}
	var Color = function(r, g, b, a) {
		this.r = r;
		this.g = g;
		this.b = b;
		this.a = a;
	};
	
	("global", eval)("this").Color = Color;
})();
