'use strict';

var crypto = require('crypto');
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
 * @todo Complete the PhidgetLED object.
 * @todo Add support for more Phidget boards
 */
module.exports = {};

/**
 * The `Phidget` class is an abstract class providing common properties and methods to all
 * the board-specific child classes. This class cannot be instantiated directly. Please
 * instantiate one of the child classes instead:
 *
 *    * {{#crossLink "PhidgetInterfaceKit"}}{{/crossLink}}
 *    * {{#crossLink "PhidgetLED"}}{{/crossLink}}
 *
 * @class Phidget
 * @constructor
 * @throws {Error} This class is abstract, you cannot instantiate it directly.
 * @throws {Error} Unsupported device type.
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
    throw new Error("Unsupported device type.");
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
   * Whether to try to automatically reopen the device if it gets remotely closed.
   * @property reopen
   * @type {Boolean}
   * @default true
   */
  this.reopen = true;

  /**
   * The host name or address of the Phidgets WebService to connect to.
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
   * The unique label of the device. The label must have a maximum length of 10
   * characters. If you try to set a longer label, the remainder will be truncated. Labels
   * are supported only on newer devices and are remembered even when the device is
   * unplugged. A label can only be set after a Phidget has been 'opened'. Trying to set
   * the label before that will fail silently.
   *
   * @property label
   * @type {String}
   * @default undefined
   */
  Object.defineProperty(this, 'label', {
    enumerable: true,
    get: function () {
      return (self._label);
    },
    set: function(value) {
      if (self.ready) {
        self._label = value.substr(0, 10);
        self._sendPck(self._makePckString('Label'), self._label, true);
      }
    }
  });

  /**
   * [read-only] The unique ID of the Phidget WebService the device is currently connected
   * to.
   *
   * @property serverId
   * @type {int}
   * @default undefined
   */
  Object.defineProperty(this, 'serverId', {
    enumerable: true,
    get: function () {
      return (self._serverId);
    }
  });

  /**
   * The password to connect to the WebService. If specified, it will be used when opening
   * a new connection. As soon as connected the password property will be erased. THIS IS
   * CURRENTLY SET TO PRIVATE BECAUSE IT'S NOT IMPLEMENTED YET!
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
   * The delay (in milliseconds) between report updates sent from the webservice.
   *
   * @property interReportPeriod
   * @type {int}
   * @default 8
   */
  Object.defineProperty(this, 'interReportPeriod', {
    enumerable: true,
    get: function () {
      return (self._interReportPeriod);
    },
    set: function(value) {
      self._interReportPeriod = parseInt(value);
      self._sendLine("report " + self._interReportPeriod + " report");
    }
  });

  this._client = null;
  this._delimiter = '\r\n';
  this._inputBuffer = '';
  this._interReportPeriod = 8;
  this._label = undefined;
  this._name = undefined;
  this._openTimeOutDuration = 1000;
  this._openTimeOutId = undefined;
  this._protocol = "1.0.10";
  this._ready = false;
  this._reopenCount = 0;
  this._reopenDelay = 1000;
  this._reopenMaxCount = 5;
  this._version = undefined;

};

util.inherits(Phidget, EventEmitter);

/**
 * Opens a connection to a Phidget device. Opening a connection is a two-step process.
 * First, a connection to the Phidget WebService (which must be running) is established.
 * Then, a session to the specified device (which must be plugged in) is opened.
 *
 * @method open
 * @param {Object} [options={}] Options
 * @param {String} [options.host="127.0.0.1"] Hostname or IP address to connect to
 * @param {int} [options.port=5001] Port to connect to
 * @param {int} [options.serial] Serial number of the device to connect to
 * @param {String} [options.label] Label of the device to connect to (can be set in the
 *        Phidgets control panel).
 * @returns {Phidget} Returns the Phidget to allow method chaining.
 * @chainable
 */
Phidget.prototype.open = function(options) {

  var self = this;

  options = options || {};
  if (options.host)     { this.host = options.host; }
  if (options.port)     { this.port = options.port; }
  if (options.serial)   { this.serial = options.serial; }
  if (options.label)    { this._label = options.label; }
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

  });

  self._client.on('error', function(e) {
    self._handleConnectionError(e);
  });

  return self;

};

/**
 * Closes a previously opened connection to a Phidget device.
 *
 * @method close
 * @returns {Phidget} Returns the Phidget to allow method chaining.
 * @chainable
 */
Phidget.prototype.close = function() {

  var self = this;

  if (!self.ready) { return self; }

  self.reopen = false;
  clearTimeout(self._openTimeOutId);

  var message  = "/PCK/Client/0.0.0.0/" + self._randomId + "/" + self.type;
  if (self.label) {
    message += "/-1/" + self.label;
  } else if (self.serial && self.serial > 0) {
    message += "/" + self.serial;
  }
  self._sendPck(message, 'Close', false);
  self._sendLine("quit");

  self._terminateConnection();
  return self;

};

/** @private */
Phidget.prototype._terminateConnection = function() {

  var self = this;

  self._client.removeAllListeners(['end', 'error', 'data']);
  self._client.destroy();
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
  if(self.reopen === true && self._reopenCount < self._reopenMaxCount) {

    self._reopenCount++;

    // Instead of trying to reconnect right away, we give a little time for the network or
    // device to come back
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
          {attempt: self._reopenCount, max: self._reopenMaxCount}
        );
        self.open();
      },
      self._reopenDelay
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
      clearTimeout(self._openTimeOutId);
      self._reopenCount = 0;

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

  } else if (status === 994) {    // Version mismatch

    err = new Error('Protocol version mismatch.', 'PROTOCOL_MISMATCH');
    err.details = line;
    self.emit('error', self, err);

  } else if (status === 996) {   // Authenticated or no authentication necessary

    // Adjust inter-report period (triggering the setter will send the request to the
    // Phidget WebService.
    self.interReportPeriod = self._interReportPeriod;

    // Open session to a specific device. The factors deciding which device to connect to
    // are: type, label (optional) and serial (optional).
    self._randomId = Math.floor(Math.random() * 99999);
    var pck  = "/PCK/Client/0.0.0.0/" + self._randomId + "/" + self.type;
    if (self._label) {
      pck += "/-1/" + self._label;
    } else if (self.serial && self.serial > 0) {
      pck += "/" + self.serial;
    }
    self._sendPck(pck, 'Open', false);

    // Issue "listen" command
    self._sendLine("listen /PSK/" + self.type + " lid0");

    // Here we have a challenge: if we connect successfully to the web service but the
    // device is not plugged in, we do not know. That's why the device is set as ready
    // only when the first occurrence of the following line is received: "report
    // 200-that's all for now". If that line is not received within a certain delay, we
    // must issue a timeout.
    self._openTimeOutId = setTimeout(
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
      self._openTimeOutDuration
    );

  } else if (status === 998) {     // Authentication failed

    err = new Error('The authentication attempt failed.', 'AUTHENTICATION_FAILED');
    err.details = line;
    self.emit('error', self, err);
    self.reopen = false;
    self._terminateConnection();

  } else if (status === 999) {   // Authentication required

    if (!self.password) {

      err = new Error(
        'A connection to this Phidget WebService requires a valid password.',
        'PASSWORD_REQUIRED'
      );
      err.details = line;
      self.emit('error', self, err);
      self.reopen = false;
      self._terminateConnection();

    } else {

      var ticket = line.split(" ")[1] + self.password;
      self.password = undefined;
      var hash = crypto.createHash('md5');
      hash.update(ticket, 'utf8');
      self._sendLine("997 " + hash.digest('hex'));

    }

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
  var status  = psk.split('" (')[1].replace(")", ''); // added, changed, removing, etc.

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

    self._label = label;

  } else if ( keyword === 'ID' && status === 'added' ) {

    self._serverId = value;

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
 * @private
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
 * @param [persistent=false] {Boolean} Whether the value should persist or whether its for
 *        the session only.
 * @private
 */
Phidget.prototype._sendPck = function (key, value, persistent) {
  var self = this;
  var request = "set " + key + "=\"" + value + "\"";
  if(!persistent) { request += " for session"; }
  self._sendLine(request);
};

/**
 * Sends a line of data to the webservice
 *
 * @method _sendLine
 * @param line {String} A non-terminated line of data to send
 * @private
 */
Phidget.prototype._sendLine = function (line) {
  var self = this;
  self._client.write(line + self._delimiter);

  /**
   * Event emitted when a new line of data has been sent to the Phidget WebService. This
   * is mostly useful for debugging purposes (hence the @private denomination). It will
   * let you view all data going out.
   *
   * @event sent
   * @param emitter {Phidget} The actual Phidget object that emitted the event.
   * @param data {String} The actual string of sent data.
   * @private
   */
  self.emit('sent', self, line);
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

module.exports.Phidget = Phidget;


/****************************************************************************************/
/*********************************  PhidgetInterfaceKit  ********************************/
/****************************************************************************************/

/**
 * The `PhidgetInterfaceKit` class allows you to control and receive data from all Phidget
 * interface kit boards :
 *
 *  * PhidgetInterfaceKit 8/8/8 normal and mini-format
 *  * PhidgetInterfaceKit 2/2/2
 *  * PhidgetInterfaceKit 0/16/16
 *  * PhidgetInterfaceKit 8/8/8 (with and without hub)
 *  * etc.
 *
 * Not all of these boards have been tested. If you possess one and can verify its
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
   * [read-only] An object containing information about the digital inputs of the device.
   * Here are a few examples of how to retrieve information in that object:
   *
   *     PhidgetInterfaceKit.inputs[5].value         // Input 5 current value
   *     PhidgetInterfaceKit.inputs.count            // Total number of inputs on the device
   *
   * @property inputs {Object}
   * @property inputs.count {int} The total number of inputs on the device.
   * @property inputs[int].value {int} The current value of the specified input.
   */
  this.inputs = {};

  /**
   * [read-only] An object containing information about the analog sensor inputs of the
   * device. Here are a few examples of how to retrieve information in that object:
   *
   *     PhidgetInterfaceKit.sensors[5].value         // Sensor 5 current value
   *     PhidgetInterfaceKit.sensors.count            // Total number of sensors on the device
   *     PhidgetInterfaceKit.sensors[3].sensitivity   // Sensor 3 sensitivity level
   *
   * @property sensors {Object}
   * @property sensors.count {int} The total number of sensors on the device.
   * @property sensors[int].rawValue {int} The current raw value of the specified sensor.
   * @property sensors[int].sensitivity {int} The sensitivity threshold of the specified
   *           sensor.
   * @property sensors[int].updateInterval {int} The update interval of the specified
   *           sensor.
   * @property sensors[int].value {int} The current value of the specified sensor.
   */
  this.sensors = {};

  /**
   * [read-only] An object containing information about the digital outputs of the device.
   * Here are a few examples of how to retrieve information in that object:
   *
   *     PhidgetInterfaceKit.outputs[5].value     // Output 5 current value
   *     PhidgetInterfaceKit.outputs.count        // Total number of outputs on the device
   *
   * @property outputs {Object}
   * @property outputs.count {int} The total number of outputs on the device.
   * @property outputs[int].value {int} The current value of the specified output.
   */
  this.outputs = {};

  /**
   * Determines whether ratiometric values should be used or not for analog sensors. If
   * this property is defined before the phidget is opened, it will be set as soon as
   * possible after opening it. If it is defined after the board is opened and ready, it
   * will be set right away.
   *
   * @property ratiometric {Boolean}
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
  this._shortestUpdateInterval = undefined;
  this._longestUpdateInterval = undefined;
  this._interruptRate = undefined;

};

util.inherits(PhidgetInterfaceKit, Phidget);

/**
 * Sets the specified output to active (true) or inactive (false). This method should only
 * be used after the board is 'opened'. Calling it before will fail silently.
 *
 * @method setOutput
 * @param index {int|Array} The output number to set (or array of output numbers)
 * @param [value=false] {Boolean} The value you wish to set the output to.
 * @returns {PhidgetInterfaceKit} Returns the PhidgetInterfaceKit to allow method
 *          chaining.
 * @chainable
 */
PhidgetInterfaceKit.prototype.setOutput = function(index, value) {

  var self = this;
  if (self.ready !== true) { return self; }

  index = [].concat(index);
  value = (value === true);
  var vOut = (value === true) ? 1 : 0;

  for (var i = 0; i < index.length; i++) {
    var pos = parseInt(index[i]);
    if (!self.outputs[pos]) { self.outputs[pos] = {}; }
    self.outputs[pos].value = value;
    self._sendPck(self._makePckString('Output', pos), vOut, true);

    /**
     * Event emitted when an output's status is changed.
     *
     * @event output
     * @param {PhidgetInterfaceKit} emitter The actual PhidgetInterfaceKit object that
     *        emitted the event.
     * @param {Object} data An object containing the output data and related information
     * @param {int} data.index The output's index number
     * @param {int} data.value The output's new value
     */
    self.emit(
      "output",
      self,
      { "index": pos, "value": self.outputs[pos].value }
    );

  }

  return self;

};

/**
 * Sets the update interval of a sensor. The update interval is the number of
 * milliseconds between update notifications. The shorter the interval is and the more
 * frequent the updates will be. However, shorter intervals are more demanding on the cpu.
 * This function accepts a single sensor number or an array of sensor numbers to set. This
 * method should only be used after the board is 'opened'. Calling it before will fail
 * silently.
 *
 * @method setUpdateInterval
 * @param index {int|Array} The sensor's number (or an array of sensor numbers)
 * @param [value=16] {int} The number of milliseconds you wish to set the interval to.
 * @returns {PhidgetInterfaceKit} Returns the PhidgetInterfaceKit to allow method
 *          chaining.
 * @chainable
 */
PhidgetInterfaceKit.prototype.setUpdateInterval = function(index, value) {

  var self = this;
  if (self.ready !== true) { return self; }

  index = [].concat(index);
  value = value || 16;
  value = self._forceBetween(value, self._shortestUpdateInterval, self._longestUpdateInterval);

  for (var i = 0; i < index.length; i++) {
    var pos = parseInt(index[i]);
    if (!self.sensors[pos]) { self.sensors[pos] = {}; }
    self.sensors[pos].updateInterval = value;
    self._sendPck(self._makePckString('DataRate', pos), value, true);
  }

  return self;

};

/**
 * Sets the sensitivity threshold of a sensor. The threshold is measured in `sensorvalue`
 * (0-1000). It is the smallest change that will trigger an update notification from the
 * sensor. Sensitivity threshold and update intervals are mutually exclusive. If you set
 * the sensitivity of a sensor, the update interval will be ignored and vice versa.
 *
 * This function accepts a single sensor number or an array of sensor numbers for which to
 * set the sensitivity.
 *
 * This method should only be used after the board is 'opened'. Calling it before will
 * fail silently.
 *
 * @method setSensitivity
 * @param index {int|Array} The sensor's number (or an array of sensor numbers)
 * @param [value=10] {int} The number sensitivity threshold to assign (0-1000)
 * @returns {PhidgetInterfaceKit} Returns the PhidgetInterfaceKit to allow method
 *          chaining.
 * @chainable
 */
PhidgetInterfaceKit.prototype.setSensitivity = function(index, value) {

  var self = this;
  if (self.ready !== true) { return self; }

  index = [].concat(index);
  value = value || 10;
  value = self._forceBetween(value, 0, 1000);

  for (var i = 0; i < index.length; i++) {
    var pos = parseInt(index[i]);
    if (!self.sensors[pos]) { self.sensors[pos] = {}; }
    self.sensors[pos].sensitivity = value;
    self._sendPck(self._makePckString('Trigger', pos), value, true);
  }

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

  if (data.keyword === "Input") {

    if (!self.inputs[data.index]) { self.inputs[data.index] = {}; }
    self.inputs[data.index].value = (data.value === '1');

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
      { "index": data.index, "value": self.inputs[data.index].value }
    );

  } else if (data.keyword === "Sensor") {

    // The event is emitted after RawSensor is received to make sure both have been
    // received (it's always right after).
    if (!self.sensors[data.index]) { self.sensors[data.index] = {}; }
    self.sensors[data.index].value = parseInt(data.value);

  } else if (data.keyword === 'RawSensor') {

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
    if (!self.sensors[data.index]) { self.sensors[data.index] = {}; }
    self.sensors[data.index].rawValue = parseInt(data.value);
    self.emit(
      "sensor",
      self,
      { "index": data.index, "value": self.sensors[data.index].value }
    );

  } else if (data.keyword === "Output") {

    if (!self.outputs[data.index]) { self.outputs[data.index] = {}; }
    self.outputs[data.index].value = (data.value === '1');

  } else if (data.keyword === 'Ratiometric') {
    self._ratiometric = (data.value === '1');
  } else if (data.keyword === 'NumberOfInputs') {
    self.inputs.count = parseInt(data.value);
  } else if (data.keyword === 'NumberOfOutputs') {
    self.outputs.count = parseInt(data.value);
  } else if (data.keyword === 'NumberOfSensors') {
    self.sensors.count = parseInt(data.value);
  } else if (data.keyword === 'DataRate') {
    if (!self.sensors[data.index]) { self.sensors[data.index] = {}; }
    self.sensors[data.index].updateInterval = parseInt(data.value);
  } else if (data.keyword === 'DataRateMax') {
    self._shortestUpdateInterval = parseInt(data.value);
  } else if (data.keyword === 'DataRateMin') {
    self._longestUpdateInterval = parseInt(data.value);
  } else if (data.keyword === 'Trigger') {
    if (!self.sensors[data.index]) { self.sensors[data.index] = {}; }
    self.sensors[data.index].sensitivity = parseInt(data.value);
  } else if (data.keyword === 'InterruptRate') {
    self._interruptRate = parseInt(data.value);
  }

};

module.exports.PhidgetInterfaceKit = PhidgetInterfaceKit;

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

  var self = this;

  /**
   * [read-only] An object containing information about all LED outputs of the device.
   * Here are a few examples of how to retrieve information in that object:
   *
   *     PhidgetLED.leds[5].value     // LED 5 current value
   *     PhidgetLED.leds.count        // Total number of LED outputs on the device
   *
   * @property leds {Object}
   * @property leds.count {int} The total number of physical LED outputs on the device.
   * @property leds[int].value {int} The current brightness value of the specified LED
   *           output (between 0 and 100)
   * @property leds[int].currentLimit {int} The current limit of the specified LED output
   *           (in mA).
   */
  this.leds = {};

  /**
   * The global voltage for all led outputs. When setting the voltage, you must use one of
   * the values in the `PhidgetLED.supportedVoltages` array. Valid values currently are
   * (in volts):
   *
   * * 1.7
   * * 2.75
   * * 3.9
   * * 5
   *
   * Trying to set the voltage to another value will fail silently. This is not supported
   * by all PhidgetLED boards.
   *
   * @property voltage {Number}
   */
  Object.defineProperty(this, 'voltage', {
    enumerable: true,
    get: function () {
      return (self._voltage);
    },
    set: function(value) {
      if (self.ready) {
        var index = self.supportedVoltages.indexOf(value) + 1;
        if (index > 0) {
          self._sendPck(self._makePckString('Voltage'), index, true);
          self._voltage = value;
        }
      }
    }
  });

  /**
   * The global "current limit" for all led outputs. When setting the global current
   * limit, you must use one of the values in the
   * `PhidgetLED.supportedGlobalCurrentLimits` array. Valid values currently are (in mA):
   * 20, 40, 60, 80. Trying to set the current limit to another value will fail silently.
   *
   * This is not supported by all PhidgetLED boards.
   *
   * @property currentLimit {Number}
   */
  Object.defineProperty(this, 'currentLimit', {
    enumerable: true,
    get: function () {
      return (self._currentLimit);
    },
    set: function(value) {
      if (self.ready) {
        var index = self.supportedGlobalCurrentLimits.indexOf(value) + 1;
        if (index > 0) {
          self._sendPck(self._makePckString('CurrentLimit'), index, true);
          self._currentLimit = value;
        }
      }
    }
  });

  /**
   * [read-only] Array of supported voltages (in volts).
   * @property supportedVoltages {Array}
   */
  Object.defineProperty(this, 'supportedVoltages', {
    enumerable: true,
    writable: false,
    value: [1.7, 2.75, 3.9, 5]
  });

  /**
   * [read-only] An array of values that are valid when setting the global current limit
   * (in mA).
   * @property supportedGlobalCurrentLimits {Array}
   */
  Object.defineProperty(this, 'supportedGlobalCurrentLimits', {
    enumerable: true,
    writable: false,
    value: [20, 40, 60, 80]
  });

  this._voltage = undefined;
  this._currentLimit = undefined;

};

util.inherits(PhidgetLED, Phidget);

/**
 * Adjusts the brightness of a LED.
 *
 * @method setBrightness
 * @param index {int|Array} The LED output number for which to adjust the brightness (or
 *        array of LED output numbers)
 * @param [value=100] {int} The value (0-100) you wish to adjust the brightness to.
 * @returns {Phidget} Returns the Phidget to allow method chaining
 * @chainable
 */
PhidgetLED.prototype.setBrightness = function(index, value) {

  var self = this;
  if (!self.ready || index === undefined) { return self; }

  index = [].concat(index);
  value = self._forceBetween(value, 0, 100) || 100;

  for (var i = 0; i < index.length; i++) {
    var pos = self._forceBetween(index[i], 0, 63);
    self._sendPck(self._makePckString('Brightness', pos), value, true);
    self.leds[pos].value = value;
    /**
     * Event emitted right after a LED's brightness has been changed.
     *
     * @event brightness
     * @param {PhidgetInterfaceKit} emitter The actual PhidgetInterfaceKit object that
     *        emitted the event.
     * @param {Object} data An object containing the brightness data and related
     *        information
     * @param {int} data.index The LED output index number
     * @param {int} data.value The brightness value
     */
    self.emit(
      "brightness",
      self,
      { "index": pos, "value": self.leds[pos].value }
    );
  }

  return self;

};

/**
 * Sets the current limit (in mA) for a specific LED output (or an array of LED outputs).
 * The value must be between 0 and 80 mA. If the value provided is outside this range, the
 * closest acceptable value will be used instead.
 *
 * @method setCurrentLimit
 * @param index {int|Array} The LED output number (or array of LED output numbers) for
 *        which to adjust the current limit
 * @param [value=20] {Number} The value you wish to adjust the current limit to. Should be within
 *        the range defined by `PhidgetLED.currentLimitRange`.
 * @returns {Phidget} Returns the Phidget to allow method chaining
 * @chainable
 */
PhidgetLED.prototype.setCurrentLimit = function(index, value) {

  var self = this;
  if (!self.ready || index === undefined) { return self; }

  index = [].concat(index);
  value = self._forceBetween(value, 0, 80) || 20;

  for (var i = 0; i < index.length; i++) {
    var pos = self._forceBetween(index[i], 0, self.leds.count);
    self._sendPck(self._makePckString('CurrentLimitIndexed', pos), value, true);
    self.leds[pos].currentLimit = value;
  }

  return self;

};

PhidgetLED.prototype._parsePhidgetSpecificData = function (data) {

  var self = this;

  if (data.keyword === "NumberOfLEDs") {
    self.leds.count = parseInt(data.value);
  } else if (data.keyword === "Voltage") {
    var v = self._forceBetween(data.value, 1, 4);
    self._voltage = self.supportedVoltages[v - 1];
  } else if (data.keyword === "CurrentLimit") {
    self._currentLimit = self.supportedGlobalCurrentLimits[data.value - 1];
  } else if (data.keyword === "Brightness") {
    if (!self.leds[data.index]) { self.leds[data.index] = {}; }
    self.leds[data.index].value = parseInt(data.value);
  } else if (data.keyword === "CurrentLimitIndexed") {
    if (!self.leds[data.index]) { self.leds[data.index] = {}; }
    self.leds[data.index].currentLimit = parseInt(data.value);
  }

};

module.exports.PhidgetLED = PhidgetLED;