# phidgets
_A [Node.js](http://www.nodejs.org/) and [iojs.org](http://www.iojs.org/)-compatible
JavaScript library to interface with the Phidgets line of hardware boards._

[![NPM](https://nodei.co/npm/phidgets.png?downloads=true)](https://nodei.co/npm/phidgets/) [![NPM](https://nodei.co/npm-dl/phidgets.png?months=6&height=2)](https://nodei.co/npm/phidgets/)

[Phidget boards](http://www.phidgets.com/) are a great prototyping tool which can handle
digital inputs and outputs, along with a great array of analog sensors (RFID, temperature,
distance, etc.).  [Node.js](http://nodejs.org) and [io.js](http://iojs.org) are fantastic
networking library which makes it easy to create fast networked applications.  This
project aims to make it simple for them to interact. Synergy!

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

The most common way to interact with a *phidgets* board is to set up listeners for the
things you are interested in. For example, this code will log to the console all changes
detected on the analog sensor inputs of the device:

```javascript
var phidgets = require('phidgets');

var pik = new phidgets.PhidgetInterfaceKit();

pik.on('sensor', function(emitter, data) {
    console.log('Sensor: ' + data.index + ', value: ' + data.value);
});

pik.open();
```

Since the all relevant functions are chainable, the above example can be written more
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

At any time, you can check the status of any inputs, sensors or outputs. Depending on the
type of board you are using, all of these will or will not be available. For example, on a
`PhidgetLED` board, there are not inputs or sensors. However, you can still read the state
of outputs by looking at the `PhidgetLED.outputs` object. This object will look like this:

```javascript
{
    '0': 0,
    '1': 67,
    '2': 0,
    '3': 13,
    // etc.
}
```

The `outputs` object is read-only. If you want to change the value of an output, use the
relevant method. For example, to change the output on a `PhidgetInterfaceKit`, you would
use the `setOutput()` method. To do the same on a `PhidgetLED`, you would use
`setBrightness()`.

### Supported boards

Currently, all interface kit boards are supported through the `PhidgetInterfaceKit`
object. This includes boards such as:

 * PhidgetAnalog 4-Output
 * PhidgetInterfaceKit 8/8/8 normal and mini-format
 * PhidgetInterfaceKit 2/2/2
 * PhidgetInterfaceKit 0/16/16
 * PhidgetInterfaceKit 8/8/8 (with and without hub)
 * PhidgetFrequencyCounter
 * etc.

Also included via the `PhidgetLED` object is the following:

 * PhidgetLED

Other boards will be added in the future. Help from contributors is always welcomed.

If you are in a hurry, and can support the development effort, please contact one of the
[project contributors](https://github.com/cotejp/node-phidgets/graphs/contributors).

### Documentation

The full [API documentation](http://cote.cc/w/wp-content/uploads/projects/phidgets/docs/)
is available for download in the *docs* folder. You can also view it online.


>### Warning to users of version <= 0.4.0
>
>The API in version 0.5.0 has changed and is not backwards-compatible. This change was made
>mandatory bin order to support more than the original InterfaceKit boards.
>
>An archived copy of [version 0.4.0]
>(http://cote.cc/w/wp-content/uploads/projects/phidgets/nodePhidgets-0.4.0.zip) is being
>kept around for those needing to maintain older projects. However, if possible we
>recommend you to update to the new version and architecture. It already provides plenty of
>improvements and more are to come.


### ToDo:
* Support for phidget authentication
* Support for more boards
