'use strict';

var net = require('net');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

/**
 * The `Phidgets` library module makes it easy to connect to a variety of boards made by
 * [Phidgets Inc.](http://www.phidgets.com)
 *
 * @module phidgets
 *
 *
 * @todo add support for connecting to a board by label.
 * @todo add support for authentication
 * @todo complete close function
 * @todo understand what lid0 does ?!
 * @todo implement a decent toString() method
 * @todo get rid of data and put innput, output and sensors at the top
 * @todo make label, serial and name read-omly
 *
 *
 * done: chainable, timeout if no connection, module, recovers when server goes down or
 * device unplugged, name and label retrieved from server
 */
var phidgets = {};

/**
 * The Phidget class is an abstract class providing common properties and methods to all
 * the board-specific child classes. This class cannot be instantiated directly. Please
 * instantiate one of the child classes instead (PhidgetInterfaceKit, PhidgetLED, etc.).
 *
 * @class Phidget
 * @constructor
 */
var Phidget = function(type) {

  if (this.constructor === Phidget) {
    throw new Error("This class is abstract, you cannot instantiate it directly.");
  }

  /**
   * Array of all the devices supported by this library.
   * @type {string[]}
   */
  this.supportedDevices = [
    'PhidgetInterfaceKit',
    'PhidgetLED'
  ];

  if (this.supportedDevices.indexOf(type) < 0) {
    throw new Error("Unsupported device type");
  }

  /**
   * The type of device (i.e. PhidgetInterfaceKit, PhidgetLED, etc.)
   * @property type
   * @type {String}
   */
  this.type = type;

  /**
   * Whether the device is ready for use or not. A device must be 'opened' before it can
   * be used.
   * @property ready
   * @type {Boolean}
   * @default false
   */
  this.ready = false;

  /**
   * Whether to try automatically reopen the device if it gets remotely closed.
   * @property reopen
   * @type {Boolean}
   * @default true
   */
  this.reopen = true;

  /**
   * The host name or address of the Phidgets webservice to connect to.
   * @property host
   * @type {String}
   * @default 127.0.0.1
   */
  this.host = "127.0.0.1";

  /**
   * The port of the Phidgets webservice to connect to.
   * @property port
   * @type {int}
   * @default 5001
   */
  this.port = 5001;

  /**
   * The unique serial number of the device. This is undefined until the device is opened.
   * @property serial
   * @type {int}
   * @default undefined
   */
  this.serial = undefined;

  /**
   * The unique label of the device. This is undefined until the device is opened.
   * @property label
   * @type {String}
   * @default undefined
   */
  this.label = undefined;

  /**
   * Human-readable version of the board's name (i.e. "Phidget InterfaceKit 8/8/8". This
   * information is only available after the connection has been successfully opened.
   * @type {String}
   * @default undefined
   */
  this.name = undefined;

  this._client = null;
  this._randomId = Math.floor(Math.random() * 99999);
  this._socketDataString = '';
  this._protocol = "1.0.10";
  this._delimiter = '\r\n';
  this._reopeningDelay = 1000;
  this._reopeningCount = 0;
  this._maxReopeningAttempts = 5;
  this._openingTimeoutDuration = 1000;
  this._openingTimeoutId = undefined;

  return this;

};

util.inherits(Phidget, EventEmitter);




//Phidget.prototype._cleanup = function(self) {
//console.log("CLEANUP!!!");
//  if (this._client) {
//    this._client.destroy();
//  }
//};

////process.stdin.resume();
//process.on('exit', function() {this._cleanup(self);} );
//process.on('SIGINT', function() {this._cleanup(self);} );
////process.on('uncaughtException', this._cleanup(self));


/**
 * Opens a connection to a Phidget device (via the webservice).
 *
 * @method open
 * @param {Object} options Options
 * @param {String} options.host Hostname or IP address to connect to
 * @param {int} options.port Port to connect to
 * @param {int} options.serial Serial of the device to connect to
 * @returns {Phidget} Returns the Phidget to allow method chaining
 */
Phidget.prototype.open = function(options) {

  var self = this;

  options = options || {};
  if (options.host)   { this.host = options.host; }
  if (options.port)   { this.port = options.port; }
  if (options.serial) { this.serial = options.serial; }

  /**
   * Event emitted when an attempt to open a Phidget has been initiated.
   *
   * @event opening
   * @param {Phidget} emitter The actual Phidget object that emitted the event.
   */
  self.emit('opening', self);

  // The function passed as a parameter is only executed when the 'connect' event is
  // received.
  self._client = net.createConnection(self.port, self.host, function() {

    self._client.setEncoding('utf8');
    self._client.setKeepAlive("enable", 10000);

    self._client.on('end', function() {
      console.log("end end end");
      self._handleConnectionEnd(self);
    });

    self._client.on('data', function(d) {
      self._handleData(d, self);
    });

    self._client.write("995 authenticate, version=" + self._protocol + self._delimiter);
    self._client.write("report 8 report" + self._delimiter);

    // Open connection to web service
    var message  = "set /PCK/Client/0.0.0.0/" + self._randomId + "/" + self.type;

    // If a label has been specified, use it. If not, use the serial.
    //if (self.label !== undefined) {
    //  message   += "/-1/" + _escapeLabel(self.label);
    //} else if (self.serial !== -1) {
    if (self.serial > 0) {
      message   += "/" + self.serial;
    }

    message += "=\"Open\" for session" + self._delimiter;
    self._client.write(message);

    // Listen message
    self._client.write("listen /PSK/" + self.type + " lid0" + self._delimiter);

    // Here we have a challenge: if we connect successfully to the web service but the
    // device is not plugged in, we do not know. That's why the device is set as ready
    // only when the following line is received: 'report 200-periodic report follows:'. If
    // that line is not received within a certain delay, we must issue a timeout.
    self._openingTimeoutId = setTimeout(
      function() {
        /**
         * Event emitted when an attempt to open a Phidget times out.
         *
         * @event timeout
         * @param {Phidget} emitter The actual Phidget object that emitted the event.
         */
        self.emit('timeout', self);
        self._handleConnectionEnd(self);
      },
      self._openingTimeoutDuration
    );

  });

  self._client.on('error', function(e) {
    self._handleConnectionError(e, self);
  });

  return self;

};

/**
 * Closes a previously opened connection to a Phidget device (via the webservice).
 *
 * @method close
 * @returns {Phidget} Returns the Phidget to allow method chaining
 */
Phidget.prototype.close = function() {
  var self = this;
  self.reopen = false;
  self._client.write("quit\r\n");
  return self;
};

/** @private */
Phidget.prototype._handleConnectionEnd = function(self) {

  self._client.removeAllListeners(['end', 'close', 'error', 'data']);
  self._client.end();
  self._client.destroy();
  //self._client.unref();
  self.ready = false;

  /**
   * Event emitted when the connection to a phidget has been remotely closed.
   *
   * @event closed
   * @param {Phidget} emitter The actual object that emitted the event.
   */
  self.emit('closed', self);

  // Attempt to reopen if configured as such
  if(self.reopen === true && self._reopeningCount < self._maxReopeningAttempts) {

    self._reopeningCount++;

    setTimeout(
      function() {
        /**
         * Event emitted when an attempt to automatically re-open a closed Phidget is
         * being carried on.
         *
         * @event reopening
         * @param {Phidget} emitter The actual Phidget object that emitted the event.
         * @param {Object} data Additional data regarding the event.
         * @param {int} data.attempt The number of re-opening attempts performed.
         * @param {int} data.max The maximum number of attempts that will be tried before
         * failing.
         */
        self.emit(
          'reopening',
          self,
          {attempt: self._reopeningCount, max: self._maxReopeningAttempts}
        );
        self.open();
      },
      self._reopeningDelay
    );

  }
};

/** @private */
Phidget.prototype._handleConnectionError = function(e, self) {
  /**
   * Event emitted when an error occurs while trying to open a phidget
   *
   * @event error
   * @param {Phidget} emitter The actual object that emitted the event.
   * @param {Error} error The error object
   * @param {String} error.address The network address
   * @param {String} error.code The error code
   * @param {String} error.errno The error number
   * @param {String} error.message The error message
   * @param {String} error.port The network port
   */
  self.emit('error', self, e);

  self._handleConnectionEnd(self);

};

/** @private */
Phidget.prototype._handleData = function(chunk, self) {

  var index, line;

  chunk = chunk.toString('utf8');
  self._socketDataString += chunk;

  while( (index = self._socketDataString.indexOf('\n')) > -1 ) {

    line = self._socketDataString.slice(0, index);
    self._socketDataString = self._socketDataString.slice(index + 1);
    line = line.replace(/\u0000/gi, "");
    line = line.replace(/\u0001/gi, "");

    /**
     * Event emitted when a new line of data has been received from the web service. This
     * is mostly useful for debugging purposes. It will let you view all data coming in.
     *
     * @event received
     * @param {Phidget} emitter The actual Phidget object that emitted the event.
     * @param {String} data The actual string data received.
     */
    self.emit('received', self, line);

    self._parseLineInput(line, self);

  }

};

/** @private */
Phidget.prototype._parseLineInput = function(line, self) {

  var err;

  //    200 set successful
  //    200 inter-report period adjusted to 8ms.
  //    200 listening, id lid0
  //    996 No need to authenticate, version=1.0.10

  // Split on spaces
  var status = line.split(" ")[0];

  if (status === 'report') {

    self._parseReport(line, self);

  //} else if(status === '200') {

    // Positive response. Nothing to do.

  } else if(status === '994') { // Version mismatch

    err = new Error('Protocol version mismatch.', 'PROTOCOLMISMATCH');
    err.details = line;
    self.emit('error', self, err);

  //} else if(status === '996') { // Authenticated or no authentication necessary

    // Nothing to do.

  } else if(status === '998') { // Authentication failed

    err = new Error('Authentication failed', 'AUTHFAILED');
    err.details = line;
    self.emit('error', self, err);

  //} else if(status === '999') { // Authentication required

    // to complete!

  }

};

/** @private */
Phidget.prototype._parseReport = function(line, self) {

  // A typical report line looks like this (for DataRate, RawSensor, Sensor, Input, Output)
  //
  //    report 200-lid0 is pending, key /PSK/PhidgetInterfaceKit/mylabel/48587/Output/6 latest value "0" (changed)
  //    report 200-lid0 is pending, key /PSK/PhidgetInterfaceKit/mylabel/RawSensor/6 latest value "0" (removing)
  //
  // We extract the infos into an array
  //
  //    0: PSK
  //    1: PhidgetInterfaceKit
  //    2: mylabel
  //    3: 48587
  //    4: Output
  //    5: 6 latest value "0" (changed)
  //
  // A report line when the device is unplugged
  //
  //    report 200-lid0 is pending, key /PSK/PhidgetInterfaceKit/mylabel/48587/Status latest value "Detached" (removing)
  //
  // More examples that remain to be done:
  //
  //    report 200-lid0 is pending, key /PSK/PhidgetInterfaceKit/mylabel/48587/DataRate/5 latest value "16" (added)
  //    report 200-lid0 is pending, key /PSK/PhidgetInterfaceKit/mylabel/48587/DataRateMax latest value "16" (added)
  //    report 200-lid0 is pending, key /PSK/PhidgetInterfaceKit/mylabel/48587/DataRateMin latest value "1000" (added)
  //    report 200-lid0 is pending, key /PSK/PhidgetInterfaceKit/mylabel/48587/InitKeys latest value "61" (added)
  //    report 200-lid0 is pending, key /PSK/PhidgetInterfaceKit/mylabel/48587/InterruptRate latest value "8" (added)
  //    report 200-lid0 is pending, key /PSK/PhidgetInterfaceKit/mylabel/48587/ID latest value "69" (added)
  //    report 200-lid0 is pending, key /PSK/PhidgetInterfaceKit/mylabel/48587/NumberOfOutputs latest value "8" (added)
  //    report 200-lid0 is pending, key /PSK/PhidgetInterfaceKit/mylabel/48587/NumberOfInputs latest value "8" (added)
  //    report 200-lid0 is pending, key /PSK/PhidgetInterfaceKit/mylabel/48587/NumberOfSensors latest value "8" (added)
  //    report 200-lid0 is pending, key /PSK/PhidgetInterfaceKit/mylabel/48587/Ratiometric latest value "1" (added)
  //    report 200-lid0 is pending, key /PSK/PhidgetInterfaceKit/mylabel/48587/Status latest value "Attached" (added)
  //    report 200-lid0 is pending, key /PSK/PhidgetInterfaceKit/mylabel/48587/Status latest value "Detached" (removing)
  //    report 200-lid0 is pending, key /PSK/PhidgetInterfaceKit/mylabel/48587/Version latest value "904" (added)
  //    report 200-that's all for now


  var parts = line.split("/").slice(1);

  if (!self.serial) {
    self.serial = parseInt(parts[3]);
  }

  //if (self.label === undefined) {
  //  self.label = infos[2];
  //}

  var type = parts[4];

  if (type && type === 'Status latest value "Detached" (removing)') {

    self._handleConnectionEnd(self);

  } else if (
    type &&
    type.indexOf('Name latest value "') === 0 &&
    type.indexOf("(added)") > -1
  ) {

    // report 200-lid0 is pending, key /PSK/PhidgetInterfaceKit/mylabel/48587/Name latest value "Phidget InterfaceKit 8/8/8" (removing)
    // report 200-lid0 is pending, key /PSK/PhidgetInterfaceKit/mylabel/48587/Name latest value "Phidget InterfaceKit 8/8/8" (added)
    self.name = line.split('"')[1];

  } else if (
    type &&
    type.indexOf('Label latest value "') === 0 &&
    type.indexOf("(added)") > -1
  ) {

    // report 200-lid0 is pending, key /PSK/PhidgetInterfaceKit/mylabel/48587/Label latest value "mylabel" (added)
    self.label = line.split('"')[1];

  } else if (line === 'report 200-periodic report follows:') {

    // report 200-periodic report follows:

    if (self.ready === false) {

      self.ready = true;
      clearTimeout(self._openingTimeoutId);
      self._reopeningCount = 0;

      /**
       * Event emitted when a phidget is successfully opened.
       *
       * @event opened
       * @param {Phidget} emitter The actual Phidget object that emitted the event.
       */
      self.emit("opened", self);

    }

  } else {

    self._parsePhidgetSpecificReport(line, parts);

  }

};

/**
 * Parses 'report' lines that are specific to one phidget model. Should be overridden by
 * subclasses
 *
 * @method _parsePhidgetSpecificReport
 * @param line {String} The raw line received from the webservice.
 * @param parts {Array} The raw line split on the "/" character.
 * @protected
 */
Phidget.prototype._parsePhidgetSpecificReport = function (line, parts) {

  var self = this;

  var type = parts[4];

  if (type === 'Input' || type === 'Output' || type === 'Sensor') {

    var infos = parts[5].split(" ");
    var index = parseInt(infos[0]);
    var value = parseInt(infos[3].replace('"', ""));

    if (type === "Input") {

      self.inputs[index] = (value === 1);

      /**
       * Event emitted when binary input data is received.
       *
       * @event input
       * @param {Phidget} emitter The actual Phidget object that emitted the event.
       * @param {Object} data An object containing the input data and related information
       * @param {int} data.index The input's index number
       * @param {Boolean} data.value The input's received value
       */
      self.emit(
        "input",
        self,
        {"index": index, "value": value}
      );

    } else if (type === "Sensor") {

      self.sensors[index] = value;

      /**
       * Event emitted when analog sensor data is received
       *
       * @event sensor
       * @param {Phidget} emitter The actual Phidget object that emitted the event.
       * @param {Object} data An object containing the sensor data and related information
       * @param {int} data.index The sensor's index number
       * @param {int} data.value The sensor's received value
       */
      self.emit(
        "sensor",
        self,
        {"index": index, "value": value}
      );

    } else if (type === "Output") {

      self.outputs[index] = value;

      /**
       * Event emitted when data is being outputted through one of the outputs
       *
       * @event output
       * @param {Phidget} emitter The actual Phidget object that emitted the event.
       * @param {Object} data An object containing the output data and related information
       * @param {int} data.index The sensor's index number
       * @param {int} data.value The sensor's received value
       */
      self.emit(
        "output",
        self,
        {"index": index, "value": value}
      );

    }
  }

};


/**
 * @method _makeIndexedKey
 * @protected
 */
Phidget.prototype._makeIndexedKey = function (keyword, index) {
  var self = this;
  return '/PCK/' + self.type +'/'+self.serial+'/'+keyword+'/'+index;
};

/**
 * @method _sendKey
 * @protected
 */
Phidget.prototype._sendKey = function (key, value, persistent) {
  var self = this;
  var request = "set " + key + "=\"" + value + "\"";
  if(!persistent) { request += " for session"; }
  self._client.write(request + self._delimiter);
  console.log('request: ' + request);
};

/**
 * @method _forceBetween
 * @protected
 */
Phidget.prototype._forceBetween = function(value, min, max) {
  return (Math.min(max, Math.max(min, value)));
};


//function _escapeLabel(val, escBacks) {
//
//  var esc = escBacks || false;
//
//  var newVal = "";
//  if(val.length === 0) {
//    newVal = (esc ? "\\\\x01" : "\\x01");
//  } else {
//    for (var i = 0; i < val.length; i++) {
//      var charCode = val.charCodeAt(i);
//      if (!_isGoodChar(charCode)) {
//        newVal = newVal.concat((escBacks ? "\\\\x" : "\\x") + _hexChar(charCode / 16) + _hexChar(charCode % 16));
//      } else {
//        newVal = newVal.concat(String.fromCharCode(charCode));
//      }
//    }
//  }
//  return newVal;
//}
//
//function _isGoodChar(charCode) {
//  var chars = "09azAZ ./";
//  if(charCode <= chars.charCodeAt(1) && charCode >= chars.charCodeAt(0)) { return true; }
//  if(charCode <= chars.charCodeAt(3) && charCode >= chars.charCodeAt(2)) { return true; }
//  if(charCode <= chars.charCodeAt(5) && charCode >= chars.charCodeAt(4)) { return true; }
//  if(
//    charCode === chars.charCodeAt(6) ||
//    charCode === chars.charCodeAt(7) ||
//    charCode === chars.charCodeAt(8)
//  ) { return true; }
//  return false;
//}
//
//function _hexChar(num) {
//  var chars = "0123456789abcdef";
//  if(num > 0xF) { return "f"; }
//  return chars.charAt(num);
//}







/****************************************************************************************/
/*********************************  PhidgetInterfaceKit  ********************************/
/****************************************************************************************/

/**
 * The PhidgetInterfaceKit class allows you to control and receive data from all Phidget
 * I/O boards :
 *
 *  * PhidgetAnalog 4-Output
 *  * PhidgetInterfaceKit 8/8/8 normal and mini-format
 *  * PhidgetInterfaceKit 2/2/2
 *  * PhidgetInterfaceKit 0/16/16
 *  * PhidgetInterfaceKit 8/8/8 (with and without hub)
 *  * PhidgetFrequencyCounter
 *  * etc.
 *
 * Not all these boards have been tested. If you possess one and can verify its
 * compatibility, let us know.
 *
 * @class PhidgetInterfaceKit
 * @constructor
 * @extends Phidget
 */
var PhidgetInterfaceKit = function() {
  PhidgetInterfaceKit.super_.call(this, 'PhidgetInterfaceKit');

  /**
   * An object containing the current value for all board inputs. The values are boolean.
   * To retrieve a value simply use the input number. For example:
   * PhidgetInterfaceKit.inputs[5].
   *
   * @property inputs
   * @type {{}}
   */
  this.inputs = {};

  /**
   * An object containing the current value for all board sensors. The values are
   * integers. To retrieve a vlaue simply use the sensor number. For example:
   * PhidgetInterfaceKit.sensors[5].
   *
   * @property sensors
   * @type {{}}
   */
  this.sensors = {};

  /**
   * An object containing the current value for all board outputs. The values are
   * boolean. To retrieve a value, simply use the output number. For example:
   * PhidgetInterfaceKit.outputs[5].
   *
   * @property outputs
   * @type {{}}
   */
  this.outputs = {};

};

util.inherits(PhidgetInterfaceKit, Phidget);

/**
 * Sets the specified output to active (true) or inactive (false).
 *
 * @method setOutput
 * @param {int} index The output number to set
 * @param {Boolean} value The value you wish to set the output to
 * @returns {Phidget} Returns the Phidget to allow method chaining
 */
PhidgetInterfaceKit.prototype.setOutput = function(index, value) {

  var self = this;
  if (self.ready !== true) { return self; }

  value = (value === true) ? true : false;
  index = self._forceBetween(index, 0, 7);
  var vOut = (value === true) ? 1 : 0;

  self.outputs[index] = value;
  self._sendKey(self._makeIndexedKey('Output', index), vOut, true);

  return self;

};

/**
 * Parses 'report' lines received from the webservice that are specific to the
 * PhidgetInterfaceKit boards.
 *
 * @method _parsePhidgetSpecificReport
 * @param line {String} The raw line received from the webservice.
 * @param parts {Array} The raw line split on the "/" character.
 * @private
 */
PhidgetInterfaceKit.prototype._parsePhidgetSpecificReport = function (line, parts) {

  var self = this;

  var type = parts[4];

  if (type === 'Input' || type === 'Output' || type === 'Sensor') {

    var infos = parts[5].split(" ");
    var index = parseInt(infos[0]);
    var value = parseInt(infos[3].replace('"', ""));

    if (type === "Input") {

      self.inputs[index] = (value === 1);

      /**
       * Event emitted when binary input data is received.
       *
       * @event input
       * @param {PhidgetInterfaceKit} emitter The actual PhidgetInterfaceKit object that
       *        emitted the event.
       * @param {Object} data An object containing the input data and related information
       * @param {int} data.index The input's index number
       * @param {Boolean} data.value The input's received value
       */
      self.emit(
        "input",
        self,
        {"index": index, "value": value}
      );

    } else if (type === "Sensor") {

      self.sensors[index] = value;

      /**
       * Event emitted when analog sensor data is received
       *
       * @event sensor
       * @param {PhidgetInterfaceKit} emitter The actual PhidgetInterfaceKit object that
       *        emitted the event.
       * @param {Object} data An object containing the sensor data and related information
       * @param {int} data.index The sensor's index number
       * @param {int} data.value The sensor's received value
       */
      self.emit(
        "sensor",
        self,
        {"index": index, "value": value}
      );

    } else if (type === "Output") {

      self.outputs[index] = value;

      /**
       * Event emitted when data is being outputted through one of the outputs
       *
       * @event output
       * @param {PhidgetInterfaceKit} emitter The actual PhidgetInterfaceKit object that
       *        emitted the event.
       * @param {Object} data An object containing the output data and related information
       * @param {int} data.index The sensor's index number
       * @param {int} data.value The sensor's received value
       */
      self.emit(
        "output",
        self,
        {"index": index, "value": value}
      );

    }
  }

};

/****************************************************************************************/
/*************************************  PhidgetLED  *************************************/
/****************************************************************************************/

/**
 * The PhidgetLED class allows you to control a PhidgetLED-64 Advanced board.
 *
 * @class PhidgetLED
 * @constructor
 * @extends Phidget
 */
var PhidgetLED = function() {
  PhidgetLED.super_.call(this, 'PhidgetLED');

  /**
   * An object containing the current value for all board outputs. The values are
   * integers between 0 and 100. To retrieve the value simply use the output number. For
   * example: PhidgetLED.outputs[5].
   *
   * @property outputs
   * @type {{}}
   */
  this.outputs = {};

};

util.inherits(PhidgetLED, Phidget);

/**
 * Adjusts the brightness of a LED.
 *
 * @method setBrightness
 * @param {int} index The LED to for which to adjust the brightness
 * @param {int} value The value (0-100) you wish to adjust the brightness to
 * @returns {Phidget} Returns the Phidget to allow method chaining
 */
PhidgetLED.prototype.setBrightness = function(index, value) {

  var self = this;
  if (self.ready !== true) { return self; }

  index = self._forceBetween(index, 0, 63);
  value = self._forceBetween(value, 0, 100);

  self._sendKey(self._makeIndexedKey('Brightness', index), value, true);
  self.outputs[index] = value;

  return self;

};






phidgets.Phidget = Phidget;
phidgets.PhidgetInterfaceKit = PhidgetInterfaceKit;
phidgets.PhidgetLED = PhidgetLED;
module.exports = phidgets;