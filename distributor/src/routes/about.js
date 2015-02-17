var config = require('config');
exports.index = function(req, res) {
	res.render('about/index', {
		title : 'Sashimi - About',
		page : 'about'
	});
};