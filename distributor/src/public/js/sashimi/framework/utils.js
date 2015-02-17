Sashimi.Framework.Utils = {
	getDatum : function() {
		var stored_data = {};
		// GC
		var gc_list = [];
		var max_stored_data_num = 30;
		var gc_ratio = 0.1;
		return function(data_id, callback) {
			addGCList(data_id);
			if (typeof stored_data[data_id] === 'undefined') {
				$.post(
						'/api',
						{
							command : 'get_datum',
							data_id : data_id
						},
						function(data) {
							if (data.code > 0) {
								console.error(data);
							} else {
								stored_data[data_id] = data.data;
								callback(stored_data[data_id]);
								GC();
							}
						}
					);
			} else {
				callback(stored_data[data_id]);
			}
		};
		
		function GC() {
			if (Math.random() > gc_ratio) {
				return;
			}
			while(gc_list.length > max_stored_data_num) {
				var id_to_delete = gc_list.shift();
				delete stored_data[id_to_delete];
			}
		}
		
		function addGCList(data_id) {
			for (var i = gc_list.length - 1; i >= 0; i--) {
				if (gc_list[i] === data_id) {
					gc_list.splice(i, 1);
					break;
				}
			}
			gc_list.push(data_id);
		}
	}(),
	
	getFile : function() {
		var stored_files = {};
		// GC
		var gc_list = [];
		var max_stored_data_num = 30;
		var gc_ratio = 0.1;
		var encodeHTMLForm = function(data) {
			var params = [];
			for (var name in data) {
				var value = data[name];
				var param = encodeURIComponent(name).replace(/%20/g, '+') + '=' + encodeURIComponent(value).replace(/%20/g, '+');
				params.push(param);
			}
			return params.join('&');
		};
		return function(file_id, callback) {
			addGCList(file_id);
			if (typeof stored_files[file_id] === 'undefined') {
				var xhr = new XMLHttpRequest();
				xhr.open('POST', '/api', true);
				xhr.responseType = 'arraybuffer';
				xhr.onload = function(e) {
					stored_files[file_id] = xhr.response;
					callback(xhr.response);
					GC();
				};
				xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
				var post_data = {
					command : 'get_file',
					file_id : file_id
				};
				xhr.send(encodeHTMLForm(post_data));
			} else {
				callback(stored_files[file_id]);
			}
		}
		
		function GC() {
			if (Math.random() > gc_ratio) {
				return;
			}
			while(gc_list.length > max_stored_data_num) {
				var id_to_delete = gc_list.shift();
				delete stored_files[id_to_delete];
			}
		}
		
		function addGCList(file_id) {
			for (var i = gc_list.length - 1; i >= 0; i--) {
				if (gc_list[i] === file_id) {
					gc_list.splice(i, 1);
					break;
				}
			}
			gc_list.push(file_id);
		}
	}()
};