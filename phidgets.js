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
		var conn = phidgets.client;
		conn.setEncoding('utf8');
		conn.setKeepAlive("enable", 10000)
		conn.on('data', phidgets.handleData);
		conn.on('end', phidgets.handleConnectionEnd);
		conn.on('close', phidgets.handleConnectionEnd);
		conn.on('error', phidgets.handleError);
		
		conn.write("need nulls\r\n");
		conn.write("995 authenticate, version="+params.version+"\r\n"); // 995 authenticate, version=1.0.9
		conn.write("report 8 report\r\n");
		conn.write("set /PCK/Client/0.0.0.0/" + Math.random() + "/PhidgetInterfaceKit=\"Open\" for session\r\n"); // set /PCK/Client/0.0.0.0/123/PhidgetInterfaceKit="Open" for session
		conn.write("listen /PSK/PhidgetInterfaceKit lid0\r\n");
		
		next(conn);
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
