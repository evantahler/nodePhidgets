'use strict';

var net = require('net');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

/****************************************************************************************/
/**************************************  Phidget  ***************************************/
/****************************************************************************************/

/**
 * The `Phidgets` library module makes it easy to connect to various sensor and controller
 * boards made by [Phidgets Inc.](http://www.phidgets.com) This library works under
 * [Node.js](http://www.nodejs.org) and other compatible frameworks such as
 * [io.js](http://www.iojs.org)
 *
 * For support, go to the GitHub [project page](https://github.com/evantahler/nodePhidgets).
 *
 * Please note that this library is an open source project that is not affiliated with
 * Phidgets Inc.
 *
 * @module phidgets
 *
 * @todo Add support for authentication.
 * @todo Complete the close() function (see AS3 source for example).
 * @todo Understand what lid0 does. I do not see it used anywhere ?!
 * @todo Implement a decent toString() method for completeness.
 * @todo There seems to be an issue in nw.js when the app is reloaded.
 * @todo Create getter and setter for label because it must match certain requirements.
 * @todo Parse missing report lines for PhidgetInterfaceKit and PhidgetLED.
 * @todo Create getter/setter for interReportPeriod. It cannot be set after connection.
 * @todo There are issues with the reconnection procedures when it times out.
 */
var phidgets = {};

/**
 * The `Phidget` class is an abstract class providing common properties and methods to all
 * the board-specific child classes. This class cannot be instantiated directly. Please
 * instantiate one of the child classes instead (`PhidgetInterfaceKit`, `PhidgetLED`,
 * etc.).
 *
 * @class Phidget
 * @constructor
 */
var Phidget = function(type) {

  var self = this;

  if (this.constructor === Phidget) {
    throw new Error("This class is abstract, you cannot instantiate it directly.");
  }

  /**
   * [read-only] Array of all the devices supported by this library.
   * @property supportedDevices
   * @type {string[]}
   * @readOnly
   */
  Object.defineProperty(this, 'supportedDevices', {
    enumerable: true,
    writable: false,
    value: [
      'PhidgetInterfaceKit',
      'PhidgetLED'
    ]
  });

  if (this.supportedDevices.indexOf(type) < 0) {
    throw new Error("Unsupported device type");
  }

  /**
   * [read-only] The type of device (i.e. PhidgetInterfaceKit, PhidgetLED, etc.).
   *
   * @property type
   * @type {String}
   * @readOnly
   */
  Object.defineProperty(this, 'type', {
    enumerable: true,
    writable: false,
    value: type
  });

  /**
   * [read-only]  Whether the device is ready for use or not. A device must be 'opened'
   * before it can be used.
   *
   * @property ready
   * @type {Boolean}
   * @readOnly
   */
  Object.defineProperty(this, 'ready', {
    enumerable: true,
    get: function () {
      return (self._ready);
    }
  });

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
   * The unique serial number of the device. If specified, it will be used to connect to
   * the matching device.
   *
   * @property serial
   * @type {int}
   * @default undefined
   */
  this.serial = undefined;

  /**
   * The unique label of the device. If specified, it will be used to connect to the
   * matching device.
   *
   * @property label
   * @type {String}
   * @default undefined
   */
  this.label = undefined;

  /**
   * The unique ID of the Phidget WebService the device is currently connected to.
   *
   * @property serverId
   * @type {int}
   * @default undefined
   */
  this.serverId = undefined;

  /**
   * The password to connect to the WebService. If specified, it will be used when opening
   * a new connection. As soon as connected the password will be erased. THIS IS CURRENTLY
   * SET TO PRIVATE BECAUSE IT'S NOT IMPLEMENTED YET!
   *
   * @property password
   * @type {String}
   * @default undefined
   * @private
   */
  this.password = undefined;

  /**
   * [read-only] Human-readable version of the board's name (i.e. "Phidget InterfaceKit
   * 8/8/8". This information is only available some time after the connection has been
   * successfully opened.
   *
   * @property name
   * @type {String}
   * @default undefined
   */
  Object.defineProperty(this, 'name', {
    enumerable: true,
    get: function () {
      return (self._name);
    }
  });

  /**
   * [read-only] This number distinguishes between revisions of a specific type of
   * Phidget. It is only useful for debugging purposes. This information is only available
   * some time after the connection has been successfully opened.
   *
   * @property version
   * @type {String}
   * @default undefined
   */
  Object.defineProperty(this, 'version', {
    enumerable: true,
    get: function () {
      return (self._version);
    }
  });

  /**
   * The delay (in milliseconds) between report updates sent from the webservice. This is
   * requested of the server during the opening of a phidget. Therefore, if you want to
   * use it, you must assign it before calling `open()`.
   *
   * @property serial
   * @type {int}
   * @default 8
   */
  this.interReportPeriod = 8;

  this._ready = false;
  this._client = null;
  this._name = undefined;
  this._version = undefined;
  this._randomId = Math.floor(Math.random() * 99999);
  this._inputBuffer = '';
  this._protocol = "1.0.10";
  this._delimiter = '\r\n';
  this._reopeningDelay = 500;
  this._reopeningCount = 0;
  this._maxReopeningAttempts = 5;
  this._openingTimeoutDuration = 1000;
  this._openingTimeoutId = undefined;

  return this;

};

util.inherits(Phidget, EventEmitter);

/**
 * Opens a connection to a Phidget device (via the webservice).
 *
 * @method open
 * @param {Object} [options] Options
 * @param {String} [options.host] Hostname or IP address to connect to
 * @param {int} [options.port] Port to connect to
 * @param {int} [options.serial] Serial number of the device to connect to
 * @param {String} [options.label] Label of the device to connect to (can be set in the
 *        Phidget control panel).
 * @returns {Phidget} Returns the Phidget to allow method chaining
 */
Phidget.prototype.open = function(options) {

  var self = this;

  options = options || {};
  if (options.host)     { this.host = options.host; }
  if (options.port)     { this.port = options.port; }
  if (options.serial)   { this.serial = options.serial; }
  if (options.label)    { this.label = options.label; }
  if (options.password) { this.password = options.password; }

  /**
   * Event emitted when an attempt to open a Phidget has been initiated.
   *
   * @event opening
   * @param {Phidget} emitter The actual Phidget object that emitted the event.
   */
  self.emit('opening', self);

  // The function passed as a parameter is only executed when the 'connect' event is
  // received (only on success). That's why the 'error' handler needs to be below.
  self._client = net.createConnection(self.port, self.host, function() {

    // Makes the data come in as a string instead of a Buffer object
    self._client.setEncoding('utf8');
    self._client.setKeepAlive("enable", 10000);

    self._client.on('end', function() {
      self._handleConnectionEnd();
    });

    self._client.on('data', function(d) {
      self._handleData(d);
    });

    // Open connection to Phidget WebService and set reporting delay (the delay between
    // automatic status reports sent out by the server).
    self._sendLine("995 authenticate, version=" + self._protocol);
    self._sendLine("report " + self.interReportPeriod + " report");

    // Open session to a specific device. The factors deciding which device to connect to
    // are: type, label (optional) and serial (optional).
    var message  = "set /PCK/Client/0.0.0.0/" + self._randomId + "/" + self.type;
    if (self.label) {
      message += "/-1/" + self.label;
    } else if (self.serial && self.serial > 0) {
      message += "/" + self.serial;
    }
    message += '="Open" for session';
    self._sendLine(message);

    // Listen message
    self._sendLine("listen /PSK/" + self.type + " lid0");

    // Here we have a challenge: if we connect successfully to the web service but the
    // device is not plugged in, we do not know. That's why the device is set as ready
    // only when the first occurrence of the following line is received: "report
    // 200-that's all for now". If that line is not received within a certain delay, we
    // must issue a timeout.
    self._openingTimeoutId = setTimeout(
      function() {
        /**
         * Event emitted when an attempt to open a Phidget times out.
         *
         * @event timeout
         * @param {Phidget} emitter The actual Phidget object that emitted the event.
         */
        self.emit('timeout', self);
        self._handleConnectionEnd();
      },
      self._openingTimeoutDuration
    );

  });

  self._client.on('error', function(e) {
    self._handleConnectionError(e);
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

  // Only close if open
  if (self.ready) {
    self.reopen = false;
    // In case close() is called before the initial check timeout has had time to expire
    clearTimeout(self._openingTimeoutId);
    self._sendLine("quit");
    self._terminateConnection();
  }

};

/** @private */
Phidget.prototype._terminateConnection = function() {

  var self = this;

  self._client.removeAllListeners(['end', 'error', 'data']);
  self._client.end();
  self._client.destroy();
  //self._client.unref();
  self._ready = false;

  /**
   * Event emitted when the connection to a phidget has been remotely closed.
   *
   * @event closed
   * @param {Phidget} emitter The actual object that emitted the event.
   */
  self.emit('closed', self);

};

/** @private */
Phidget.prototype._handleConnectionEnd = function() {

  var self = this;

  self._terminateConnection();

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
Phidget.prototype._handleConnectionError = function(e) {

  var self = this;

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

  self._handleConnectionEnd();

};

/**
 * This function is called each time data is received from the Phidget WebSerice. It adds
 * the data to the input buffer and checks if full lines (separated by '\n') can be
 * reconstructed. If full lines are found they are handed over to the `_parseLineInput()`
 * method for processing.
 *
 * @method _handleData
 * @param chunk {String} A chunk of utf8 encoded text to parse
 * @private
 */
Phidget.prototype._handleData = function(chunk) {

  var self = this;
  var index, line;

  self._inputBuffer += chunk;

  while( (index = self._inputBuffer.indexOf('\n')) > -1 ) {

    line = self._inputBuffer.slice(0, index);
    self._inputBuffer = self._inputBuffer.slice(index + 1);
    line = line.replace(/\u0000/gi, "");
    line = line.replace(/\u0001/gi, "");

    /**
     * Event emitted when a new line of data has been received from the web service. This
     * is mostly useful for debugging purposes (hence the @private denomination). It will
     * let you view all data coming in.
     *
     * @event received
     * @param {Phidget} emitter The actual Phidget object that emitted the event.
     * @param {String} data The actual string data received.
     * @private
     */
    self.emit('received', self, line);

    self._parseLineInput(line);

  }

};

/**
 * Parses a single line of data typically received from the Phidget WebService. If the
 * line is a *report* line, the function hands it off to the `_parsePskKey()` method.
 * Otherwise, it deals with it locally.
 *
 * @method _parseLineInput
 * @param line {String} A non-terminated line of utf8 text
 * @private
 */
Phidget.prototype._parseLineInput = function(line) {

  var self = this;
  var err;

  // Is it a report line ?
  if (line.indexOf('report') === 0 ) {

    if (line.indexOf(' is pending, key ') > -1 ) {

      // It has a key: hand it over, we are done.
      self._parsePskKey(line.split(" is pending, key ")[1], self);

    } else if (
      line.indexOf("report 200-that's all for now") === 0 &&
      self.ready === false
    ) {

      // The Phidget is attached
      self._ready = true;
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

    return;

  }

  var status = parseInt(line.split(" ")[0]);

  if (status === 200) {             // Information

    // Ignored: "200 set successful" and "200 inter-report period adjusted to 8ms."

  } else if (status === '994') {    // Version mismatch

    err = new Error('Protocol version mismatch.', 'PROTOCOL_MISMATCH');
    err.details = line;
    self.emit('error', self, err);

  } else if (status === '996') {   // Authenticated or no authentication necessary

    // nothing to do.

  } else if (status === '998') {     // Authentication failed

    err = new Error('Authentication failed', 'AUTHENTICATION_FAILED');
    err.details = line;
    self.emit('error', self, err);

  } else if (status === '999') {   // Authentication required

    err = new Error('Authentication is not yet supported', 'AUTHENTICATION_UNSUPPORTED');
    err.details = line;
    self.emit('error', self, err);

    //var ticket = line.split(" ")[1] + self.password;
    //self.password = undefined;
    //  var hash = MD5.hex_md5(ticket); <=== this is where it gets a bit more complicated!!!
    //  self._sendLine("997 " + hash);

  }

};

/**
 * Parses a /PSK string and performs appropriate action.
 *
 * @param oPsk {String} Original /PSK string typically coming from the Phidget WebService
 * @param self
 * @private
 */
Phidget.prototype._parsePskKey = function(oPsk, self) {

  // Remove front /PSK/ and retrieve necessary values
  var psk     = oPsk.split("/PSK/")[1];
  var parts   = psk.split(' ')[0].split('/');         // [PhidgetLED,label,123456,Input,4]

  var device  = parts[0];
  var label   = parts[1];
  var serial  = parseInt(parts[2]);
  var keyword = parts[3];                             // Sensor, Name, DataRate, etc.
  var index   = parseInt(parts[4]);                   // not always present
  var value   = psk.split('"')[1];                    // 69, PhidgetLED, label, 904, etc.
  var status  = psk.split('" (')[1].replace(")", ''); // added, changed, etc.

  // Grab the serial as soon as we see it. This is also our first chance to initialize
  // the board with desired phidget-specific initial settings.
  if ( !self.serial && parseInt(parts[2]) > 0 ) {
    self.serial = parseInt(parts[2]);
    self._setPhidgetSpecificInitialState();
  }

  if ( keyword === 'Status' && status === 'removing') {

    self._handleConnectionEnd();

  } else if ( keyword === 'Name' && status === 'added' ) {

    self._name = value;

  } else if ( keyword === 'Version' && status === 'added' ) {

    self._version = value;

  } else if ( keyword === 'Label' && status === 'added' ) {

    self.label = label;

  } else if ( keyword === 'ID' && status === 'added' ) {

    self.serverId = value;

  } else if ( keyword === 'InitKeys' && status === 'added' ) {

    // ignored

  } else if ( keyword === 'Status' && status === 'added' ) {

    // ignored

  } else {

    self._parsePhidgetSpecificData({
      device: device,
      label: label,
      serial: serial,
      keyword: keyword,
      index: index,
      value: value,
      status: status
    });

  }

};

/**
 * Parses Phidget-specific data received from the Phidget WebService. This function is
 * meant to be overridden by subclasses.
 *
 * @method _parsePhidgetSpecificData
 * @param data {Object} An object containing the received data
 * @param data.device {String} The device identifier (e.g. PhidgetInterfaceKey,
 *        PhidgetLED, etc.).
 * @param data.label {String} The custom label set for the device.
 * @param data.serial {int} The serial number of the device.
 * @param data.keyword {String} A keyword identifying the type of information conveyed. It
 *        could be 'Input', 'Version', 'DataRate', etc.
 * @param data.index {int} The numerical index (for indexed keys only)
 * @param data.value {String} The actual value.
 * @param data.status {String} The status of the key. It could be: 'added', 'changed',
 *        'removing', etc.
 * @protected
 */
Phidget.prototype._parsePhidgetSpecificData = function (data) {};

/**
 * Sets phidget-specific state before the 'opened' event is triggered. This is a good
 * place for subclasses to assign initial values to the board. This is meant to be
 * overridden by subclasses.
 *
 * @method _setPhidgetSpecificInitialState
 * @protected
 */
Phidget.prototype._setPhidgetSpecificInitialState = function () {};

/**
 * Returns a /PCK string built from the specified parameters. PCK strings are the keys
 * sent out to control the board.
 *
 * @method _makePckString
 * @param keyword {String} The operation keyword to use
 * @param [index] {int} The index of the output to use
 * @protected
 */
Phidget.prototype._makePckString = function (keyword, index) {
  var self = this;
  var pck = '/PCK/' + self.type + '/' + self.serial + '/' + keyword;
  if (index > -1) { pck += '/' + index; }
  return pck;
};

/**
 * Sends the /PCK string (with attached value) to the webservice.
 *
 * @method _sendPck
 * @param key {String} A /PCK string (typically form the _makePckString() method)
 * @param value {int|string} The value to set
 * @param persistent {Boolean} Whether the value should persist or whether its for the
 *        session only
 * @protected
 */
Phidget.prototype._sendPck = function (key, value, persistent) {
  var self = this;
  var request = "set " + key + "=\"" + value + "\"";
  if(!persistent) { request += " for session"; }
  self._client.write(request + self._delimiter);
};

/**
 * Sends a line of data to the webservice
 *
 * @method _sendLine
 * @param line {String} A non-terminated line of data to send
 * @protected
 */
Phidget.prototype._sendLine = function (line) {
  var self = this;
  self._client.write(line + self._delimiter);
};

/**
 * Returns the value after making sure it falls between min and max.
 *
 * @method _forceBetween
 * @param value {int|Number} The value to check
 * @param min {int} The minimum value desired
 * @param max {int} The maximum value desired
 * @return int
 * @protected
 */
Phidget.prototype._forceBetween = function(value, min, max) {
  return (Math.min(max, Math.max(min, value)));
};



/****************************************************************************************/
/*********************************  PhidgetInterfaceKit  ********************************/
/****************************************************************************************/

/**
 * The `PhidgetInterfaceKit` class allows you to control and receive data from all Phidget
 * interface boards :
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

  var self = this;

  /**
   * [read-only] An object containing the current value for all board inputs. The values
   * are boolean. To retrieve a value simply use the input number. For example:
   * PhidgetInterfaceKit.inputs[5].
   *
   * @property inputs
   * @type {{}}
   */
  this.inputs = {};

  /**
   * [read-only] An object containing the current value for all board sensors. The values
   * are integers. To retrieve a value simply use the sensor number. For example:
   * PhidgetInterfaceKit.sensors[5].
   *
   * @property sensors
   * @type {{}}
   */
  this.sensors = {};

  /**
   * [read-only] An object containing the current value for all board outputs. The values
   * are boolean. To retrieve a value, simply use the output number. For example:
   * PhidgetInterfaceKit.outputs[5].
   *
   * @property outputs
   * @type {{}}
   */
  this.outputs = {};

  /**
   * Determines whether ratiometric values should be used or not for analog sensors. If
   * this property is defined before the phidget is opened, it will be set as soon as
   * possible after opening it. If it is defined after the board is opened and ready, it
   * will be set right away.
   *
   * @property ratiometric
   * @default undefined
   */
  Object.defineProperty(this, 'ratiometric', {
    enumerable: true,
    get: function () {
      return (self._ratiometric);
    },
    set: function (value) {
      self._ratiometric = value;
      if (self.ready) {
        self._sendPck(self._makePckString('Ratiometric'), value ? 1:0, true);
      }
    }
  });

  /** @private */
  this._ratiometric = undefined;

};

util.inherits(PhidgetInterfaceKit, Phidget);

/**
 * Sets the specified output to active (true) or inactive (false).
 *
 * @method setOutput
 * @param index {int} The output number to set
 * @param value {Boolean} The value you wish to set the output to
 * @returns {PhidgetInterfaceKit} Returns the PhidgetInterfaceKit to allow method
 *          chaining.
 */
PhidgetInterfaceKit.prototype.setOutput = function(index, value) {

  var self = this;
  if (self.ready !== true) { return self; }

  value = (value === true);
  index = self._forceBetween(index, 0, 7);
  var vOut = (value === true) ? 1 : 0;

  self.outputs[index] = value;
  self._sendPck(self._makePckString('Output', index), vOut, true);

  return self;

};


PhidgetInterfaceKit.prototype._setPhidgetSpecificInitialState = function () {
  var self = this;
  if (self.ratiometric !== undefined) {
    self._sendPck(self._makePckString('Ratiometric'), (self.ratiometric ? 1:0), true);
  }
};

/** @private See overridden method for details. */
PhidgetInterfaceKit.prototype._parsePhidgetSpecificData = function (data) {

  var self = this;

  // Several report lines are not currently being parsed:
  //
  //  Indexed:
  //  /PSK/PhidgetInterfaceKit/mylabel/48587/DataRate/5 latest value "16" (added)
  //
  //  Non-indexed:
  //  /PSK/PhidgetInterfaceKit/mylabel/48587/DataRateMax latest value "16" (added)
  //  /PSK/PhidgetInterfaceKit/mylabel/48587/DataRateMin latest value "1000" (added)
  //  /PSK/PhidgetInterfaceKit/mylabel/48587/InterruptRate latest value "8" (added)
  //  /PSK/PhidgetInterfaceKit/mylabel/48587/NumberOfOutputs latest value "8" (added)
  //  /PSK/PhidgetInterfaceKit/mylabel/48587/NumberOfInputs latest value "8" (added)
  //  /PSK/PhidgetInterfaceKit/mylabel/48587/NumberOfSensors latest value "8" (added)

  if (data.keyword === "Input") {

    self.inputs[data.index] = (data.value === '1');

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
      { "index": data.index, "value": self.inputs[data.index] }
    );

  } else if (data.keyword === "Sensor") {

    self.sensors[data.index] = parseInt(data.value);

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
      { "index": data.index, "value": self.sensors[data.index] }
    );

  } else if (data.keyword === "Output") {

    self.outputs[data.index] = (data.value === '1');

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
      { "index": data.index, "value": self.outputs[data.index] }
    );

  } else if (data.keyword === 'Ratiometric') {

    self._ratiometric = (data.value === '1');

  }

};

/****************************************************************************************/
/*************************************  PhidgetLED  *************************************/
/****************************************************************************************/

/**
 * The PhidgetLED class allows you to control a PhidgetLED-64 Advanced board.
 *
 * Warning: as of now, only basic functionalities have been implemented. More to come...
 *
 * @class PhidgetLED
 * @constructor
 * @extends Phidget
 */
var PhidgetLED = function() {
  PhidgetLED.super_.call(this, 'PhidgetLED');

  /**
   * [read-only] An object containing the current value for all board outputs. The values
   * are integers between 0 and 100. To retrieve the value simply use the output number.
   * For example: PhidgetLED.outputs[5].
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
 * @param {int|int[]} index The LED to for which to adjust the brightness
 * @param {int} value The value (0-100) you wish to adjust the brightness to
 * @returns {Phidget} Returns the Phidget to allow method chaining
 */
PhidgetLED.prototype.setBrightness = function(index, value) {

  var self = this;
  if (self.ready !== true) { return self; }

  index = [].concat(index);
  value = self._forceBetween(value, 0, 100);

  for (var i = 0; i < index.length; i++) {
    var pos = self._forceBetween(index[i], 0, 63);
    self._sendPck(self._makePckString('Brightness', pos), value, true);
    self.outputs[pos] = value;
  }

  return self;

};






phidgets.Phidget = Phidget;
phidgets.PhidgetInterfaceKit = PhidgetInterfaceKit;
phidgets.PhidgetLED = PhidgetLED;
module.exports = phidgets;