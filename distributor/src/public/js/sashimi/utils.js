Sashimi.Utils = {
	showAlert : function(message) {
		var alert = $('<div class="alert alert-success alert-dismissable"><button class="close" data-dismiss="alert">&times;</button>' + message + '</div>');
		$("#alerts").prepend(alert);
		setTimeout(function() {
			alert.fadeTo(1000, 0, function() {
				alert.remove();
			})
		}, 500);
	}
};