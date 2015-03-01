# phidgets
_A [Node.js](http://www.nodejs.org/) and [iojs.org](http://www.iojs.org/)-compatible
JavaScript library to interface with the Phidgets line of hardware boards._

[![NPM](https://nodei.co/npm/phidgets.png)](https://nodei.co/npm/phidgets/) [![NPM](https://nodei.co/npm-dl/phidgets.png?months=6)](https://nodei.co/npm/phidgets/)

[Phidget boards](http://www.phidgets.com/) are a great prototyping tool which can handle
digital inputs and outputs, along with a great array of analog sensors (RFID, temperature,
distance, etc.).  [Node.js](http://nodejs.org) and [io.js](http://iojs.org) are fantastic
networking library which makes it easy to create fast networked applications.  This
project aims to make it simple for them to interact. Synergy!

## Missing boards!

## Getting started
This project assumes you have the [Phidget WebService]
(http://www.phidgets.com/docs/Phidget_WebService) up and running.  For "regular" (USB)
Phidget boards, this simply means that the computer you are connecting to has got the
webservice installed and activated.

For stand-alone Phidget Single Board Computers (phidgetsbc), this assumes you have
configured the server via the web portal. Since you will be connecting to the Phidget
server via TCP, be sure you can access the server from the machine running this project.

This library can interface with multiple phidget boards connected to a single computer via
the Phidget WebService.

## Installation
If you already have Node.js installed, you also have npm installed. This means you can
install the *phidgets* package with: `npm install phidgets`.

[Phidgets Inc.](http://www.phidgets.com) makes a line of phidget boards which are
themselves small ARM Debian computers. It it possble to run Node.js on them, and use this
package locally. Here's a [gist](https://gist.github.com/1574158) with the steps and a
[blog post](http://blog.evantahler.com/node-js-running-on-a-phidgets-sbc2-board) about how
to get this up and running.

## Examples

Here's how to set up listeners for a *PhidgetInterfaceKit* board.

The most common way to interact with a *phidgets* is to set up listeners for the things
you are interested in. For exemple, this code will log to the console all changes detected
on the analog sensor inputs of the device:

```javascript
var phidgets = require('phidgets');

var pik = new phidgets.PhidgetInterfaceKit();

pik.on('sensor', function(emitter, data) {
    console.log('Sensor: ' + data.index + ', value: ' + data.value);
});

pik.open();
```

Since the all pertinent functions are chainable, the above example can be written more
concisely:

```javascript
var phidgets = require('phidgets');

var pik = new phidgets.PhidgetInterfaceKit()
    .on('sensor', function(emitter, data) {
        console.log('Sensor: ' + data.index + ', value: ' + data.value);
    })
    .open();
```

When no parameters are passed to the `open()` method, the first matching device on the
local machine is used. If you have multiple devices connected, you can connect to a
specific one by passing its serial number or label (as defined in the webservice control
panel):

```javascript
pik.open({
    serial: 123456,
    label: mydevice
});
```

You can also connect to devices on another machine:

```javascript
pik.open({
    host: 123.123.123.123,
    port: 5001
});
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

__phidget.connect()__

__phidget.setOutput(boardId, id, value)__  This method is used to set the digital outputs of the phidget board.  `id` is a number from 0 to n, and value is `true` for on, and `false` for off.  There will be some lag (~0.5 seconds) when sending the set command to seeing the change reflected via the server and associated node event.  This is normal.  Keep this in mind, and try not to send `set` commands too fast.

If your phidgetWebService is connected to more than 1 board, you will need to provide a boardId.  Otherwise, you can send `null`, and we will look up the boardId for you.

__phidget.quit()__

## Connecting & Configuration Params
`phidget.connect` can be passed an a JSON object of options.  Here are the options and their defaults:

```javascript
{
  host:             "127.0.0.1",
  port:             5001,
  version:          "1.0.10",
  password:         null,
  delimiter:        '\r\n',
  readyWaitTimeout: 200,
  reconnectionDelay: 200
}
```

__Note on `version`__: version in this case is the version of the phidget server and associated API.  You should check your phidget server to learn the version in use.  The good news is that the APIs we are using here have not changed for the bast 3 years, and appear to be unlikely to do so in the future.  If you run into errors with newer versions, let me know.

## ToDo:
* Support for phidget authentication
