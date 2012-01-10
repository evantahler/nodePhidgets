var phidgets = {};
phidgets.data = {} // data array of current sensor values
phidgets.data.inputs = {};
phidgets.data.outputs = {};
phidgets.data.sensors = {};

////////////////////////////////////////////////////////////////////////////
// REQUIRES
phidgets.fs = require('fs');
phidgets.net = require('net');
phidgets.request = require('request');

////////////////////////////////////////////////////////////////////////////
// DEFAULTS
phidgets.defaults = {
	host: "127.0.0.1",
	port: 5001,
	version: "1.0.9",
	rawLog: false
};

////////////////////////////////////////////////////////////////////////////
// LOG (I will be overwtitten by a wrapper)
phidgets.log = function(msg){
	console.log(msg);
};

////////////////////////////////////////////////////////////////////////////
// CONNECTING AND DISCONNECTING
phidgets.connect = function(params, next){
	if(params == null){params = phidgets.defaults};
	if(params.host == null){params.host = phidgets.defaults.host;}
	if(params.port == null){params.port = phidgets.defaults.port;}
	if(params.version == null){params.version = phidgets.defaults.version;}
	if(params.rawLog == null){params.rawLog = phidgets.defaults.rawLog;}
	phidgets.params = params;
	
	phidgets.log("Connecting:");
	phidgets.log(params);
	
	phidgets.client = phidgets.net.createConnection(params.port, params.host, function(){
		var conn = phidgets.client;
		conn.setEncoding('utf8');
		conn.setKeepAlive("enable", 10000)
		conn.on('data', phidgets.handleData);
		conn.on('end', phidgets.handleConnectionEnd);
		conn.on('close', phidgets.handleConnectionEnd);
		conn.on('error', phidgets.handleError);
		
		/*
need nulls
995 authenticate, version=1.0.9
report 8 report
set /PCK/Client/0.0.0.0/123/PhidgetInterfaceKit="Open" for session
listen /PSK/PhidgetInterfaceKit lid0
		*/
		
		conn.write("need nulls\r\n");
		conn.write("995 authenticate, version="+params.version+"\r\n");
		conn.write("report 8 report\r\n");
		conn.write("set /PCK/Client/0.0.0.0/1/PhidgetInterfaceKit=\"Open\" for session\r\n");
		conn.write("listen /PSK/PhidgetInterfaceKit lid0\r\n");
		
		next(conn);
	});	
};

phidgets.connectionConfigure = function(){
	// get the board's ID for use in setting values
	// set the number of outputs to equal the number of inputs
	// get the types of all the analog sensors
}

phidgets.quit = function(){
	
};

////////////////////////////////////////////////////////////////////////////
// EVENTS
phidgets.handleData = function(data){
	try{
		var lines = data.split("\n");
		for (i in lines){
			var line = lines[i];
			line = line.replace(/\u0000/gi, "");
			line = line.replace(/\u0001/gi, "");
			if (phidgets.params.rawLog){ phidgets.log(line); }
			var words = line.split(" ");
			if(words[0] == "report" && words[3] == "pending,"){
				var keys = words[5].split("/");
				if(keys[5] == "Input"){
					var thisValue = words[8].replace('"',""); 
					phidgets.data.inputs[keys[6]] = thisValue;
				} else if(keys[5] == "Sensor"){
					var thisValue = words[8].replace('"',""); 
					phidgets.data.sensors[keys[6]] = thisValue;
				}
			}
		}
	}catch(e){}
}

phidgets.setOutput = function(output, value){
	// set /PCK/PhidgetInterfaceKit/85030/Output/3="1"
}

phidgets.handleConnectionEnd = function(data){
	phidgets.log(data);
}

phidgets.handleError = function(data){
	phidgets.log(data);
}

////////////////////////////////////////////////////////////////////////////
// EXPORT
exports.phidgets = phidgets;
