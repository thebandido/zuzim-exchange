// This is the main file of our chat app. It initializes a new 
// express.js instance, requires the config and routes files
// and listens on a port. Start the application by running
// 'node app.js' in your terminal

var https = require('https'),
	fs = require('fs'),
	express = require('express'),
	app = express(),
	crypto = require('./lib/crypto');

const Crypto = new crypto(app);


// This is needed if the app is run on heroku:

var port = process.env.PORT || 8080;

// Initialize a new socket.io object. It is bound to 
// the express app, which allows them to coexist.

// var io = require('socket.io').listen(app.listen(port));

var credentials = {
	key: fs.readFileSync('./letsencrypt/primkey.pem'),
	cert: fs.readFileSync('./letsencrypt/fullchain.pem')
};

app.use(function (req, res, next) {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
	res.setHeader('Access-Control-Allow-Credentials', true);
	next();
});

var httpsServer = https.createServer(credentials, app);
httpsServer.listen(port);
var io = require('socket.io').listen(httpsServer);


console.log('Your application is running on http://localhost:' + port);

// Require the configuration and the routes files, and pass
// the app and io as arguments to the returned functions.

require('./config')(app, io);
require('./routes')(app, io);
require('./cron/jobs')(app, io);
