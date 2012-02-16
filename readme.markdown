# nodePhidgets
_A node.js library for interacting with a Phidget board_

## WHAT?!
[Phidget boards](http://http://www.phidgets.com/) are a great prototyping tool which can handle digital inputs and outputs, along with a great array of analog sensors (RFID, temperature, etc).  [node.js](http://nodejs.org) is a fantastic networking library which makes it easy to create fast networked applications.  This project aims to make it simple to interact with them both.  Synergy!

## Phidget Server
This project assumes you have the Phidget server up and running.  For most "regular" (USB) Phidget boards, that assumes that the computer you have connected to the Phidget board via USB has the server up and running.  For stand-alone Phidget micro-computers (phidgetsbc), this assumes you have configured the server via the web portal.  You will be connecting to the Phidget server via TCP, so be sure you can access the server from the machine running this project.

__A note on the phidgetsbc micro computer:__
I am trying to compile nodeJS (V 6+) for the special flavor of the ARM chipset that is on newer phidgetsbc controllers, but I haven't had much luck :( If you are willing to help, [please take a look at my process so far](https://gist.github.com/1574158) and let me know!

## Installation
* npm install phidgets

OR

* git clone git://github.com/evantahler/nodePhidgets.git

## Running node.js on a phidget board
Phidget makes a line of phidget boards which themselves are small ARM Debian comptuers.  It it possble to run node.js on them, and use this package locally.  Here's a [gist](https://gist.github.com/1574158) with the steps and a [Blog Post](http://blog.evantahler.com/node-js-running-on-a-phidgets-sbc2-board) about hot to get this up and running.

## Interaction

The Phidgets package exposes a few different ways of interacting with your Phidget board:

### Events

Once connected, the phidgets object will throw 3 types of events: "data", "log", and "error".

__data__ is the main event which will be emitted whenever there is a status change of any of the sensors (analog) or inputs (digital).  These events will emit with `(type, id, value)`, which might be like `(Sensor, 3, 500)` which would mean Sensor ID #3 is now at analog value of 500 (mid-range).

__log__ events are optional information which you may choose to `console.log()` yourself, or can provide useful information about the status of the phidgets object.  Log messages like `connecting` or `Connected to PhidgetBoard with ID #48587` are the types of messages passed.  Also, if you have requested to disconnect from the board, a final `Connection to Phidget Board closed` message will be passed.  You can also pass an optional param of `rawLog` (boolean) when you initialize the Phidgets object to log every lone received from the phidget server.

__error__ These are normal errors which can be caught with on("error").  These will cause your application to quit when thrown if not caught.  An example would be `Error with connection to Phidget Board (networking)`.

### Objects

When you initialize the phidgets object, your callback will be passed a pointer to a data object.  This object can always be referenced to lookup the current state of all the inputs and outputs of the phidget board.  Here's an example object:

	{ inputs: { '0': 0, '1': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 0 },
	  outputs: { '0': 0, '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 0 },
	  sensors: { '0': 371, '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 259 },
	  boardID: 48587 }

The number of inputs, sensors, and outputs will vary depending on your phidget board.  

Please DO NOT set the output values via this array.  Doing so will have no effect, and will be overwritten upon update of output status.  Use the method(s) below to set outputs

### Methods

__phidgets.connect(params, callback(dataObject))__  This is the main initialize function.  Params is a JSON array of connection variables.  The (optional) callback will be called upon connection and initialization success.  In my test environment, this take ~10 seconds.  The callback will be provided the data object described above.

__phidgets.setOutput(id, value)__  This method is used to set the digital outputs of the phidget board.  `id` is a number from 0 to n, and value is `true` for on, and `false` for off.  There will be some lag (~0.5 seconds) when sending the set command to seeing the change reflected via the server and associated node event.  This is normal.  Keep this in mind, and try not to send `set` commands too fast.

__phidgets.quit(callback)__ This method requests a disconnect from the phidget board.  This is the only safe (non-error-throwing) method to disconnect.  The (optional) callback will be called when the connection has been successfully disconnected. 

## Connecting & Configuration Params
`phidgets.connect` can be passed an a JSON object of options.  Here are the options and their defaults:

	{
		host: "127.0.0.1",
		port: 5001,
		version: "1.0.9",
		password: null,
		rawLog: false
	}

__Note on `version`__: version in this case is the version of the phidget server and associated API.  You should check your phidget server to learn the version in use.  The good news is that the APIs we are using here have not changed for the bast 3 years, and appear to be unlikely to do so in the future.  If you run into errors with newer versions, let me know.


## Example

	////////////////////////////////////////////////////////////////////////////
	// IMPORT
	var phidgets = require('phidgets').phidgets;
	
	////////////////////////////////////////////////////////////////////////////
	// SETUP EVENT LISTNERS (optional)
	var ready = false;
	phidgets.on("data", function(type, id, value){
		if (ready){
			console.log(" phidgets data >> "+type+" #"+id+" now at @ "+value);
		}
	});
	phidgets.on("log", function(data){
		console.log(" phidgets log >> "+data);
		if(typeof data == "object"){ console.log(data); }
	});
	phidgets.on("error", function(e){
		console.log(" phidgets error >> "+e);
	});
	
	
	////////////////////////////////////////////////////////////////////////////
	// PARAMS TO CONNECT TO YOUR PHIDGET BOARD (defaults will be used if none provided)
	var params = {
		host: "phidgetsbc.local",
	};
	
	////////////////////////////////////////////////////////////////////////////
	// CONNECT AND GAIN ACCESS TO PHIDGET DATA OBJECT
	phidgets.connect(params, function(phidgetData){
		ready = true;
		console.log("All Connected!  Here's the array of data about inputs/outputs:");
		console.log(phidgetData);
		setTimeout(a, 1000);
	});
	
	////////////////////////////////////////////////////////////////////////////
	// CHANGE SOME OF THE OUTPUTS
	function a(){
		phidgets.setOutput(4,true); // turn digital output #4 on
		setTimeout(b, 1000);
	}
	
	function b(p){
		phidgets.setOutput(4,false); // turn digital output #4 off
		setTimeout(c, 1000);
	}
	
	////////////////////////////////////////////////////////////////////////////
	// DISCONNECT
	function c(){
		phidgets.quit(function(){
			console.log("ALL DONE!");
		});
	}

This example should produce output like this:

	> node test.js 
	 phidgets log >> Connecting:
	 phidgets log >> [object Object]
	{ host: 'phidgetsbc.local',
	  port: 5001,
	  version: '1.0.9',
	  rawLog: false }
	 phidgets log >> Not ready yet...
	 phidgets log >> Connected to PhidgetBoard with ID #48587
	All Connected!  Here's the array of data about inputs/outputs:
	{ inputs: { '0': 0, '1': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 0 },
	  outputs: { '0': 0, '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 0 },
	  sensors: { '0': 371, '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 259 },
	  boardID: 48587 }
	 phidgets data >> Output #4 now at @ 1
	 phidgets data >> Output #4 now at @ 0
	 phidgets log >> Connection to Phidget Board closed.
	ALL DONE!


## ToDo:
* Support for phidget authentication
