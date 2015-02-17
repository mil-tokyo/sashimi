var http = require('http');

var ImageUrlLoader = function(base_synset_id, full_children) {
	this.base_synset_id = base_synset_id;
	this.full_children = full_children;
	this.api_get_urls = 'http://www.image-net.org/api/text/imagenet.synset.geturls?wnid=';
	this.api_get_child_synset_ids_full = 'http://www.image-net.org/api/text/wordnet.structure.hyponym?full=1&wnid=';
	this.api_get_child_synset_ids = 'http://www.image-net.org/api/text/wordnet.structure.hyponym?wnid=';
};

ImageUrlLoader.prototype.getUrls = function(callback, errorCallback) {
	this.getChildSynsetIds(
		function(synset_ids) {
			var urls = [];
			var count = 0;
			var error = false;
			for (var i = 0; i < synset_ids.length; i++) {
				this.getUrlsFromSynsetId(synset_ids[i], getUrlsFromSynsetIdCallback, getUrlsFromSynsetIdErrorCallback)
			}
			
			function getUrlsFromSynsetIdCallback(tmp_urls) {
				count++;
				urls = urls.concat(tmp_urls);
				if (count == synset_ids.length) {
					if (error) {
						errorCallback();
					} else {
						callback(urls);
					}
				}
			}
			function getUrlsFromSynsetIdErrorCallback() {
				count++;
				error = true;
			}
		}.bind(this),
		errorCallback
	);
};

ImageUrlLoader.prototype.getUrlsFromSynsetId = function(synset_id, callback, error) {
	this.download(
			this.api_get_urls + synset_id,
			function(data) {
				data = data.trim();
				var urls = data.split('\r\n');
				for (var i = 0; i < urls.length; i++) {
					urls[i] = urls[i].trim();
				}
				callback(urls);
			}.bind(this),
			function(err) {
				error();
			}.bind(this)
		);
};

ImageUrlLoader.prototype.getChildSynsetIds = function(callback, error) {
	this.download(
		(this.full_children ? this.api_get_child_synset_ids_full : this.api_get_child_synset_ids) + this.base_synset_id,
		function(data) {
			data = data.trim();
			var synset_ids = data.split('\r\n');
			for (var i = 0; i < synset_ids.length; i++) {
				synset_ids[i] = synset_ids[i].trim();
				if (synset_ids[i].substr(0, 1) === '-') {
					synset_ids[i] = synset_ids[i].substr(1);
				}
			}
			callback(synset_ids);
		}.bind(this),
		function(err) {
			error();
		}.bind(this)
	);
}

ImageUrlLoader.prototype.download = function(url, callback, error) {
	var data = ''; 
	var req = http.get(url, function (res) {
	    res.setEncoding('utf8');
	    res.on('data', function (tmp) {
	        data += tmp;
	    });
	    res.on('end', function () {
	        callback(data);
	    }); 
	});
	req.on('error', error);
};

module.exports = ImageUrlLoader;