
/**
 * Module dependencies.
 */

var config = require('config')
  , express = require('express')
  , cluster = require('cluster')
  , routes = require('./routes')
  , about = require('./routes/about')
  , management = require('./routes/management')
  , framework = require('./routes/framework')
  , api = require('./routes/api')
  , http = require('http')
  , path = require('path')
  , ECT = require('ect')
  , ws = require('websocket.io')
  , TicketDistributor = require('./ticket_distributor')
  , WorkerToMaster = require('./worker_to_master')
  , MasterToWorker = require('./master_to_worker')
  , share = require('./share');

var httpProxy;
if (config.websocket.proxy_from_http) {
	httpProxy = require('http-proxy');
}

var app = express();

// ECT
app.engine('ect', ECT({ watch: true, root: __dirname + '/views', ext: '.ect' }).render);
app.set('view engine', 'ect');

// all environments
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

/*
process.on('uncaughtException', function (err) {
	console.error(err.stack);
});
*/

app.get('/', routes.index);
app.get('/about', about.index);
app.get(
	'/management',
	express.basicAuth(function(user, password) {
		return user === config.auth.user && password === config.auth.password;
	}
	),
	management.index
);
app.post('/management/run_code', management.run_code);
app.post('/management/kill_project', management.kill_project);
app.get('/management/ongoing_projects', management.ongoing_projects);
app.get('/management/connected_clients_num', management.connected_clients_num);
app.get('/management/connected_clients', management.connected_clients);
app.get('/framework', framework.index);
app.post('/api', api.index);

app.use(express.static(__dirname + '/public'));

if (cluster.isMaster) {
	for (var i = 0; i < 8; i++) {
		var worker = cluster.fork();
		worker.on('message', (new MasterToWorker(worker)).handleMessage);
	}
	cluster.on('exit', function(worker, code, signal) {
		console.log('worker ' + worker.process.pid + ' died');
	});
	
	// websocket
	share.ticket_distributor = new TicketDistributor(config.websocket.port);
	
} else {
	var server = http.createServer(app);
	if (config.websocket.proxy_from_http) {
		// redirect websocket connection to TicketDistributor
		var proxy = httpProxy.createServer({
			target: 'ws://localhost:' + config.websocket.port,
			ws: true
		});
		server.on('upgrade', function (req, socket, head) {
			proxy.ws(req, socket, head);
		});
	}
	server.listen(config.http.port, function(){
		console.log('Http server listening on port ' + config.http.port);
	});
	share.worker_to_master = new WorkerToMaster();
	process.on('message', share.worker_to_master.handleMessage);
}
