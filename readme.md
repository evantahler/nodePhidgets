# nodePhidgets
_A node.js library for interacting with a Phidget board_

## WHAT?!
[Phidget boards](http://www.phidgets.com/) are a great prototyping tool which can handle digital inputs and outputs, along with a great array of analog sensors (RFID, temperature, etc).  [node.js](http://nodejs.org) is a fantastic networking library which makes it easy to create fast networked applications.  This project aims to make it simple to interact with them both.  Synergy!

## Phidget Web Service
This project assumes you have the Phidget server up and running.  For most "regular" (USB) Phidget boards, that assumes that the computer you have connected to the Phidget board via USB has the server up and running.  For stand-alone Phidget micro-computers (phidgetsbc), this assumes you have configured the server via the web portal.  You will be connecting to the Phidget server via TCP, so be sure you can access the server from the machine running this project.

This package can interact with multiple phidget boards connected to a single phidgetWebService

## Installation
`npm install phidgets`

## Running node.js on a phidget board
Phidget makes a line of phidget boards which themselves are small ARM Debian comptuers.  It it possble to run node.js on them, and use this package locally.  Here's a [gist](https://gist.github.com/1574158) with the steps and a [Blog Post](http://blog.evantahler.com/node-js-running-on-a-phidgets-sbc2-board) about hot to get this up and running.

## Interaction

The Phidgets package exposes a few different ways of interacting with your Phidget board:

### Events

```javascript

var phidgetsPrototype = require('phidgets');
var options = {
  host: "phidgetsbc.local"
}
var phidgets = new phidgetsPrototype(options);

// events
phidgets.on('state',  function(state){              console.log("[state] " + state);   });
phidgets.on('error',  function(error){              console.log("[error] " + error);   });
phidgets.on('input',  function(boardId, id, value){ console.log("[" + boardId + "][input] " + id + " @ " + value);  });
phidgets.on('sensor', function(boardId, id, value){ console.log("[" + boardId + "][sensor] " + id + " @ " + value); });
phidgets.on('output', function(boardId, id, value){ console.log("[" + boardId + "][output] " + id + " @ " + value); });

phidgets.connect(function(){
  console.log('connected to PhidgetBoards:');
  console.log(phidgets.ids);
})
```

### Objects

You can also read the state of your board from `phidget.data` which will be an object like below:

```javascript
  {
    1234:
    { inputs: { '0': 0, '1': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 0 },
      outputs: { '0': 0, '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 0 },
      sensors: { '0': 371, '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 259 },
    }
  }
```

The number of inputs, sensors, and outputs will vary depending on your phidget board.  DO NOT set the output values via this object, as it won't work.

### Methods

__phidgets.connect()__  

__phidgets.setOutput(boardId, id, value)__  This method is used to set the digital outputs of the phidget board.  `id` is a number from 0 to n, and value is `true` for on, and `false` for off.  There will be some lag (~0.5 seconds) when sending the set command to seeing the change reflected via the server and associated node event.  This is normal.  Keep this in mind, and try not to send `set` commands too fast.

If your phidgetWebService is connected to more than 1 board, you will need to provide a boardId.  Otherwise, you can send `null`, and we will look up the boardId for you.

__phidgets.quit()__ 

## Connecting & Configuration Params
`phidgets.connect` can be passed an a JSON object of options.  Here are the options and their defaults:

```javascript
{
  host:             "127.0.0.1",
  port:             5001,
  version:          "1.0.10",
  password:         null,
  delimiter:        '\r\n',
  readyWaitTimeout: 200,
}
```

__Note on `version`__: version in this case is the version of the phidget server and associated API.  You should check your phidget server to learn the version in use.  The good news is that the APIs we are using here have not changed for the bast 3 years, and appear to be unlikely to do so in the future.  If you run into errors with newer versions, let me know.

## ToDo:
* Support for phidget authentication
