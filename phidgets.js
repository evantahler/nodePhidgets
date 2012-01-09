var phidgets = {};

////////////////////////////////////////////////////////////////////////////
// REQUIRES
phidgets.net = require('net');
phidgets.request = require('request');

////////////////////////////////////////////////////////////////////////////
// DEFAULTS
phidgets.defaults = {
	host: "127.0.0.1",
	port: 5001,
	version: "1.0.9"
};

////////////////////////////////////////////////////////////////////////////
// CONNECTING AND DISCONNECTING
phidgets.connect = function(params, next){
	
	if(params == null){params = phidgets.defaults};
	if(params.host == null){params.host = phidgets.defaults.host;}
	if(params.port == null){params.port = phidgets.defaults.port;}
	if(params.version == null){params.version = phidgets.defaults.version;}
	console.log("Connecting:");
	console.log(params);
	
	phidgets.client = phidgets.net.createConnection(params.port, params.host, function(){
		phidgets.client.setEncoding('utf8');
		phidgets.client.setKeepAlive("enable", 10000)
		phidgets.client.on('data', phidgets.handleData);
		phidgets.client.on('end', phidgets.handleConnectionEnd);
		phidgets.client.on('close', phidgets.handleConnectionEnd);
		phidgets.client.on('error', phidgets.handleError);
		
		phidgets.client.write("need nulls");
		phidgets.client.write("995 authenticate, version="+params.version); // 995 authenticate, version=1.0.9
		phidgets.client.write("report 8 report");
		phidgets.client.write("set /PCK/Client/0.0.0.0/" + Math.random() + "/PhidgetInterfaceKit=\"Open\" for session"); // set /PCK/Client/0.0.0.0/123/PhidgetInterfaceKit="Open" for session
		phidgets.client.write("listen /PSK/PhidgetInterfaceKit lid0");
		next(phidgets.client);
	});
};

phidgets.quit = function(){
	
};

////////////////////////////////////////////////////////////////////////////
// EVENTS
phidgets.handleData = function(data){
	console.log(data);
}

phidgets.handleConnectionEnd = function(data){
	console.log(data);
}

phidgets.handleError = function(data){
	console.log(data);
}

////////////////////////////////////////////////////////////////////////////
// EXPORT
exports.phidgets = phidgets;
