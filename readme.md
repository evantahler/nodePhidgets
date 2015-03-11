# phidgets
_A [Node.js](http://www.nodejs.org/) and [iojs.org](http://www.iojs.org/)-compatible
JavaScript library to interface with the Phidgets line of hardware boards._

[![NPM](https://nodei.co/npm/phidgets.png?downloads=true)](https://nodei.co/npm/phidgets/)
[![NPM](https://nodei.co/npm-dl/phidgets.png?months=6&height=2)](https://nodei.co/npm/phidgets/)

[Phidget boards](http://www.phidgets.com/) are a great prototyping tool which can handle
digital inputs and outputs, along with a great array of analog sensors (RFID, temperature,
distance, etc.).  [Node.js](http://nodejs.org) and [io.js](http://iojs.org) are fantastic
networking library which makes it easy to create fast networked applications.  This
project aims to make it simple for them to interact. Synergy!

>#### Warning to users of version <= 0.4.0
>
>The API in version 0.5.0 and above has changed and is not backwards-compatible. We had to
>make this change in order to support more than just the PhidgetInterfaceKit boards. An
>archived copy of
>[version 0.4.0](http://cote.cc/w/wp-content/uploads/projects/phidgets/nodePhidgets-0.4.0.zip)
>is being kept around for those needing to maintain older projects.

## Getting started
This project assumes you have the
[Phidget WebService](http://www.phidgets.com/docs/Phidget_WebService) up and running.  For
"regular" (USB) Phidget boards, this simply means that the computer you are connecting to
has got the webservice installed and started.

For stand-alone *Phidget Single Board Computers*
([phidgetsbc](http://www.phidgets.com/products.php?category=21)), this assumes you have
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

## Usage

The most common way to interact with a *phidgets* board is to set up listeners for the
whatever you are interested in. For example, this code will log to the console all changes
detected on the analog sensor inputs of the device:

```javascript
var phidgets = require('phidgets');

var pik = new phidgets.PhidgetInterfaceKit();

pik.on('sensor', function(emitter, data) {
    console.log('Sensor: ' + data.index + ', value: ' + data.value);
});

pik.open();
```
##### Using events

Obviously, many other events are available. The exact events vary with the device type. As
an example, here are the events specific to `PhidgetInterfaceKit` devices:

* **"input"** : triggered when a digital input changes status
* **"sensor"** : triggered when data is received on the analog sensors
* **"output"** : triggered when the status of a digital output changes

The following events are common to all phidgets: 

* **"opening"** : triggered when a connection to a phidget board is attempted
* **"reopening"** : triggered when trying to automatically reconnect to a remotely-closed
  phidget
* **"timeout"** : triggered when a connection attempt times out
* **"opened"** : triggered when a the connection attempt has succeeded and the board is
  ready
* **"closed"** : triggered when the connection to the board has been closed (locally or
  remotely)
* **"error"** : triggered when an error occured

##### Using chaining

Since all relevant functions are chainable, the above example can be written more
concisely:

```javascript
var phidgets = require('phidgets');

var pik = new phidgets.PhidgetInterfaceKit()
    .on('input', function(emitter, data) {
        console.log('Digital input: ' + data.index + ', value: ' + data.value);
    })
    .open();
```

##### Calling the `open()` method

When no parameters are passed to the `open()` method, the first matching device on the
local machine is used. If you have multiple devices connected, you can connect to a
specific one by passing its serial number or label (as defined in the Phidget WebService
control panel). You can also, if necessary, specify a password:

```javascript
pik.open({
    serial: 123456,
    label: "mydevice",
    password: "abc"
});
```

If you need, you can connect to devices on another machine:

```javascript
pik.open({
    host: "123.123.123.123",
    port: 5001
});
```
##### Retrieving data from the board

As illustrated above, you can retrieve data by adding the appropriate listeners
(`'input'`, `'sensor'`, etc.). You can also, at any time, manually check the status of any
inputs, sensors or outputs. Depending on the type of board you are using, all of these
will or will not be available. For example, on a `PhidgetLED` board, there are no inputs
or sensors. However, you can still read the state of all LEDS by looking at the
`PhidgetLED.leds` object. This object will look like this:

```javascript
{
    0: 0,
    1: 67,
    2: 0,
    3: 13,
    // etc.
    count: 64 // The total number of LEDs (as reported by the board)
}
```
For example, if you wanted to periodically check the status of an analog sensor hooked up
to port 3 of a `PhidgetInterfaceKit`, you could to the following:

```javascript
var phidgets = require('phidgets');

var pik = new phidgets.PhidgetInterfaceKit()
    .on('opened', function(emitter) {
        setInterval(
            function() {  console.log("Sensor 3: " + pik.sensors[3].value);  },
            1000
        );
    })
    .open();
```
##### Sending data to the board

The `outputs` object is meant to be read-only. If you want to change the value of an
output, use the relevant method. For example, to change an output on a
`PhidgetInterfaceKit`, you would use the `PhidgetInterfaceKit.setOutput()` method. To do
the same on a `PhidgetLED`, you would use `PhidgetLED.setBrightness()`.

### Supported boards

Currently, all *interface kit* boards are supported through the `PhidgetInterfaceKit`
object. This includes boards such as:

 * PhidgetInterfaceKit 8/8/8 normal and mini-format
 * PhidgetInterfaceKit 2/2/2
 * PhidgetInterfaceKit 0/16/16
 * PhidgetInterfaceKit 8/8/8 (with and without hub)

Also included in the library is full support for the following boards:

 * PhidgetLED

Other boards will be added in the future. Help from contributors is always welcomed.
Addding support for a specific board is relatively straightforward. If you are in a hurry,
and can support the development effort, please contact one of the
[project contributors](https://github.com/evantahler/nodePhidgets/graphs/contributors).

### API Documentation

If this primer wasn't enough, the full **API documentation** is available for download in
the *docs* folder. You can also
**[view it online](http://cotejp.github.io/node-phidgets/docs/)**.

### Things to do:
* Add support for missing boards.
