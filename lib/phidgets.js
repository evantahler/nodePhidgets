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
 *    * {{#crossLink "PhidgetBridge"}}{{/crossLink}}
 *    * {{#crossLink "PhidgetStepper"}}{{/crossLink}}
 *    * {{#crossLink "PhidgetTemperatureSensor"}}{{/crossLink}}
 *
 * This object extends Node.js'
 * [`events.EventEmitter` object](https://nodejs.org/api/events.html#events_class_events_eventemitter).
 * See that object's documentation for inherited methods.
 *
 * @class Phidget
 * @extends events.EventEmitter
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
      'PhidgetBridge',
      'PhidgetLED',
      'PhidgetRFID',
      'PhidgetStepper',
      'PhidgetTemperatureSensor'
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


/**
 * This is an alias for the `on()` method.
 * @method addListener
 * @param event {String} The event to add the listener for.
 * @param listener {Function} The callback function to execute when the event is
 * triggered.
 * @chainable
 */

/**
 * Adds a listener to the end of the listeners array for the specified event. No checks
 * are made to see if the listener has already been added. Multiple calls passing the same
 * combination of event and listener will result in the listener being added multiple
 * times.
 *
 * This method is inherited from Node.js'
 * [`events.EventEmitter` object](https://nodejs.org/api/events.html#events_class_events_eventemitter).
 * See that object's documentation for more details methods.
 *
 * @method on
 * @param event {String} The event to add the listener for.
 * @param listener {Function} The callback function to execute when the event is
 * triggered.
 * @chainable
 */

/**
 * Adds a one time listener for the event. This listener is invoked only the next time the
 * event is fired, after which it is removed.
 *
 * This method is inherited from Node.js'
 * [`events.EventEmitter` object](https://nodejs.org/api/events.html#events_class_events_eventemitter).
 * See that object's documentation for more details methods.
 *
 * @method once
 * @param event {String} The event to add the listener for.
 * @param listener {Function} The callback function to execute when the event is
 * triggered.
 * @chainable
 */

/**
 * Removes all listeners, or those of the specified event.
 *
 * This method is inherited from Node.js'
 * [`events.EventEmitter` object](https://nodejs.org/api/events.html#events_class_events_eventemitter).
 * See that object's documentation for more details methods.
 *
 * @method removeAllListeners
 * @param [event] {String} The event to remove the listeners for.
 * @chainable
 */

/**
 * Removes a listener from the listener array for the specified event. `removeListener()`
 * will remove, at most, one instance of a listener from the listener array. If any single
 * listener has been added multiple times to the listener array for the specified event,
 * then `removeListener()` must be called multiple times to remove each instance.
 *
 * This method is inherited from Node.js'
 * [`events.EventEmitter` object](https://nodejs.org/api/events.html#events_class_events_eventemitter).
 * See that object's documentation for more details methods.
 *
 * @method removeListener
 * @param [event] {String} The event to remove the listeners for.
 * @param listener {Function} The callback function to execute when the event is
 * triggered.
 * @chainable
 */
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

    // Open connection to Phidget WebService
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
      self.password = '';
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

  // Grab the serial as soon as we see it. This is also our first chance to initialize the board
  // with desired phidget-specific initial settings.
  if ( !self.serial && parseInt(parts[2]) > 0 ) {
    self.serial = parseInt(parts[2]);
    self._setPhidgetSpecificInitialState();
  }

  // Make sure to dispatch the incoming data only if its meant for this device (because there could
  // be more than one).
  if (serial !== this.serial) { return; }

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
 * This object extends the `Phidget` object which extends Node.js' [`events.EventEmitter` object](https://nodejs.org/api/events.html#events_class_events_eventemitter).
 * See that object's documentation for inherited methods.
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
        self._sendPck(self._makePckString('Ratiometric'), value ? 1 : 0, true);
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
 * milliseconds between update notifications. It must be a multiple of 8 between 8 and
 * 1000.
 *
 * The shorter the interval is and the more frequent the updates will be. However, shorter
 * intervals are more demanding on the cpu. This function accepts a single sensor number
 * or an array of sensor numbers to set. This method should only be used after the board
 * is 'opened'. Calling it before will fail silently.
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
  if (value % 8 !== 0) { value = 16; }
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
    self._sendPck(self._makePckString('Ratiometric'), (self.ratiometric ? 1 : 0), true);
  }
};

/** @private See overridden method for details. */
PhidgetInterfaceKit.prototype._parsePhidgetSpecificData = function (data) {

  var self = this;

  if (data.keyword === "Input") {

    if (!self.inputs[data.index]) { self.inputs[data.index] = {}; }
    self.inputs[data.index].value = (data.value === '1');

    /**
     * Event emitted when the status of a binary input changes.
     *
     * @event input
     * @param {PhidgetInterfaceKit} emitter The actual PhidgetInterfaceKit object that
     *        emitted the event.
     * @param {Object} data An object containing the input data and related information
     * @param {int} data.index The input's index number
     * @param {Boolean} data.value The input's received value
     */
    self.ready && self.emit(
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
    self.ready && self.emit(
      "sensor",
      self,
      {
        "index": data.index,
        "value": self.sensors[data.index].value,
        "rawValue": self.sensors[data.index].rawValue
      }
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
 * This object extends the `Phidget` object which itself extends Node.js'
 * [`events.EventEmitter` object](https://nodejs.org/api/events.html#events_class_events_eventemitter).
 * See that object's documentation for inherited methods.
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
    self.ready && self.emit(
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


/****************************************************************************************/
/************************************  PhidgetBridge  ***********************************/
/****************************************************************************************/

/**
 * The `PhidgetBridge` class allows you to receive data from PhidgetBridge boards. Beware
 * that each input's enabled/disabled status remains even when the device is powered off.
 * As a precaution, you can call `setEnabled()` each time your code starts:
 *
 *       phidgets = require('phidgets'),
 *       bridge = new phidgets.PhidgetBridge();
 *
 *       function onSensorData(emitter, data) {
 *          console.log(data);
 *       }
 *
 *       bridge.on("opened", function() {
 *          bridge.setEnabled(0, true);
 *          bridge.on('sensor', onSensorData);
 *       });
 *
 *       bridge.open();
 *
 * This object extends the `Phidget` object which extends Node.js' [`events.EventEmitter` object](https://nodejs.org/api/events.html#events_class_events_eventemitter).
 * See that object's documentation for inherited methods.
 *
 * @class PhidgetBridge
 * @constructor
 * @extends Phidget
 */
var PhidgetBridge = function() {
  PhidgetBridge.super_.call(this, 'PhidgetBridge');

  var self = this;

  /**
   * [read-only] An object containing information about all the bridge's sensors. Here are
   * a few examples of how to retrieve information in that object:
   *
   *     PhidgetBridge.sensors[2].value         // Sensor 2 current value
   *     PhidgetBridge.sensors.count            // Total number of sensors on the device
   *     PhidgetBridge.sensors[3].gain          // Sensor 3 sensitivity level
   *     PhidgetBridge.sensors[0].enabled       // Whether sensor 0 is currently enabled
   *
   * @property sensors {Object}
   * @property sensors.count {int} The total number of sensors on the device.
   * @property sensors[int].gain {int} The gain for this sensor (1, 8, 16, 32, 64 or 128)
   * @property sensors[int].updateInterval {int} The update interval of the specified
   *           sensor.
   * @property sensors[int].value {Number}  The current value of the specified sensor in
   *                                        mV/V. If the sensor is not enabled, this will
   *                                        be `null`.
   * @property sensors[int].min {Number}    The minimum value that the sensor can measure
   *                                        in mV/V. This value will depend on the
   *                                        selected gain. At a gain of 1, the maximum is
   *                                        -1000mV/V.
   * @property sensors[int].max {Number}    The minimum value that the sensor can measure
   *                                        in mV/V. This value will depend on the
   *                                        selected gain. At a gain of 1, the maximum is
   *                                        1000mV/V.
   */
  this.sensors = {};

  /**
   * The duration (in milliseconds) between update notifications (must be multiple of 8).
   * The shorter the interval is, the more frequent the updates will be sent by the
   * device.
   *
   * @property updateInterval {int}
   * @default 16
   */
  Object.defineProperty(this, 'updateInterval', {
    enumerable: true,
    get: function () {
      return (self._updateInterval);
    },
    set: function (value) {

      if (value % 8 !== 0) { value = 16; }

      self._updateInterval = parseInt(value);
      if (self.ready) {
        self._sendPck(self._makePckString('DataRate'), self._updateInterval, true);
      }
    }
  });

  /** @private */
  this._updateInterval = 8;

  /** @private */
  this._validGains = {
    "1": 1,
    "8": 2,
    "16": 3,
    "32": 4,
    "64": 5,
    "128": 6
  }

};

util.inherits(PhidgetBridge, Phidget);

/**
 * Sets the gain of a specific sensor (or array of sensors). Valid values are 1, 8, 16,
 * 32, 64 or 128. The highest the gain, the better the resolution. For that reason, it’s
 * best to use the highest gain possible that can still measure the full range of your
 * sensor.
 *
 * @method setGain
 * @param index {Number|Array} The sensor's number (or an array of sensor numbers)
 * @param [value=1] {Number} The gain to assign (1, 8, 16, 32, 64 or 128)
 * @returns {PhidgetBridge} Returns the PhidgetBridge to allow method chaining.
 * @chainable
 */
PhidgetBridge.prototype.setGain = function(index, value) {

  var self = this;
  if (self.ready !== true) { return self; }

  var normalized = 7; // 7 means unknown according to the API
  index = [].concat(index);

  if (self._validGains[value]) {
    normalized = self._validGains[value];
  } else {
    value = undefined;
  }

  for (var i = 0; i < index.length; i++) {
    var pos = parseInt(index[i]);
    if (!self.sensors[pos]) { self.sensors[pos] = {}; }
    self.sensors[pos].gain = value;
    self._sendPck(self._makePckString('Gain', pos), normalized, true);
  }

  return self;

};

/**
 *
 * Enables or disables a sensor. Beware that this setting remains even when the bridge is
 * powered off.
 *
 * @method setEnabled
 * @param index {int|Array} The sensor's number (or an array of sensor numbers)
 * @param [value=true] {Boolean} The status to set
 * @returns {PhidgetBridge} Returns the PhidgetBridge to allow method chaining.
 * @chainable
 */
PhidgetBridge.prototype.setEnabled = function(index, value) {

  var self = this;
  if (self.ready !== true) { return self; }

  index = [].concat(index);
  value = (value === true);

  for (var i = 0; i < index.length; i++) {
    var pos = parseInt(index[i]);
    if (!self.sensors[pos]) { self.sensors[pos] = {}; }
    self.sensors[pos].enabled = value;

    // Values cannot be received when the input is disabled
    self.sensors[pos].value = value ? 0 : null;

    self._sendPck(self._makePckString('Enabled', pos), value ? 1 : 0, true);
  }

  return self;

};

PhidgetBridge.prototype._setPhidgetSpecificInitialState = function () {};

/** @private See overridden method for details. */
PhidgetBridge.prototype._parsePhidgetSpecificData = function (data) {

  var self = this;

  if (data.keyword === 'BridgeValue') {

    /**
     * Event emitted when sensor data is received.
     *
     * @event sensor
     * @param {PhidgetBridge} emitter The actual PhidgetBridge object that emitted the
     * event.
     * @param {Object} data An object containing the sensor data and related information
     * @param {int} data.index The sensor's index number
     * @param {Number} data.value The sensor's received value
     */
    if (!self.sensors[data.index]) { self.sensors[data.index] = {}; }
    self.sensors[data.index].value = parseFloat(data.value);
    self.ready && self.emit(
      "sensor",
      self,
      {
        "index": data.index,
        "value": self.sensors[data.index].value
      }
    );

  } else if (data.keyword === 'Enabled') {
    if (!self.sensors[data.index]) { self.sensors[data.index] = {}; }
    self.sensors[data.index].enabled = (parseInt(data.value) === 1);
    self.sensors[data.index].value = self.sensors[data.index].enabled ? 0 : null;
  } else if (data.keyword === 'Gain') {
    if (!self.sensors[data.index]) { self.sensors[data.index] = {}; }
    self.sensors[data.index].gain = parseInt(data.value);
  } else if (data.keyword === 'BridgeMin') {
    if (!self.sensors[data.index]) { self.sensors[data.index] = {}; }
    self.sensors[data.index].min = parseFloat(data.value);
  } else if (data.keyword === 'BridgeMax') {
    if (!self.sensors[data.index]) { self.sensors[data.index] = {}; }
    self.sensors[data.index].max = parseFloat(data.value);
  } else if (data.keyword === 'NumberOfInputs') {
    self.sensors.count = parseInt(data.value);
  } else if (data.keyword === 'DataRate') {
    self.updateInterval = parseInt(data.value);
  } else if (data.keyword === 'DataRateMax') {
    self._shortestUpdateInterval = parseInt(data.value);
  } else if (data.keyword === 'DataRateMin') {
    self._longestUpdateInterval = parseInt(data.value);
  }

};

module.exports.PhidgetBridge = PhidgetBridge;










/****************************************************************************************/
/************************************  PhidgetStepper  **********************************/
/****************************************************************************************/

/**
 * The `PhidgetStepper` class is used to control the stepper motors connected to a
 * PhidgetStepper board. It can be used to set a target position for the motors while
 * controlling their maximum velocity and acceleration.
 *
 * Here is a simple example that moves the motor connected to output 0 to its 200 position
 * and then brings it back to position 0. Before making it move, you must first "engage"
 * the motor. Also, you should always explicitely set the desired acceleration and
 * velocity (speed).
 *
 *     var phidgets = require('phidgets');
 *     var ps = new phidgets.PhidgetStepper();
 *
 *     ps.addListener("opened", onReady);
 *
 *     function onReady() {
 *
 *        // Engage motor and set desired properties
 *        ps.engageMotor(0, true);
 *        ps.setAcceleration(0, ps.maximumAcceleration);
 *        ps.setTargetVelocity(0, ps.maximumVelocity);
 *
 *        // Makes the motor move
 *        ps.setTargetPosition(0, 200);
 *
 *        // Triggered when the target position is reached
 *        ps.once("target", function(e, data) {
 *          ps.setTargetPosition(0, 0);
 *        });
 *
 *     }
 *
 *     ps.open();
 *
 * The `PhidgetStepper` object adds 5 events to the basic ones inherited by all Phidgets.
 * They are:
 *
 *  * `position`: triggered each time the motor's position changes
 *  * `start`: triggered when a motor starts moving
 *  * `stop`: triggered when a motor stops moving
 *  * `target`: triggered when the motor has reached its target position
 *  * `input`: triggered when a digital input changes (not available on all boards)
 *
 * This object extends the `Phidget` object which itself extends Node.js'
 * [`events.EventEmitter` object](https://nodejs.org/api/events.html#events_class_events_eventemitter).
 * See that object's documentation for more inherited methods and properties.
 *
 * @class PhidgetStepper
 * @constructor
 * @extends Phidget
 */
var PhidgetStepper = function() {
  PhidgetStepper.super_.call(this, 'PhidgetStepper');

  var self = this;

  /**
   * The duration (in milliseconds) between update notifications (must be multiple of 8).
   * The shorter the interval is, the more frequent the updates will be sent by the
   * device.
   *
   * @property updateInterval {int}
   * @default 16
   */
  Object.defineProperty(this, 'updateInterval', {
    enumerable: true,
    get: function () {
      return (self._updateInterval);
    },
    set: function (value) {

      if (value % 8 !== 0) { value = 16; }

      self._updateInterval = parseInt(value);
      if (self.ready) {
        self._sendPck(self._makePckString('DataRate'), self._updateInterval, true);
      }
    }
  });

  /**
   * [Read-only] The minimum acceleration value that can be set on outputs
   * @property minimumAcceleration {Number}
   */
  Object.defineProperty(this, 'minimumAcceleration', {
    enumerable: true,
    get: function () {
      return (self._accelerationMin);
    }
  });

  /**
   * [Read-only] The maximum acceleration value that can be set on outputs
   * @property maximumAcceleration {Number}
   */
  Object.defineProperty(this, 'maximumAcceleration', {
    enumerable: true,
    get: function () {
      return (self._accelerationMax);
    }
  });

  /**
   * [Read-only] The minimum position that an output can travel to.
   * @property minimumPosition {Number}
   */
  Object.defineProperty(this, 'minimumPosition', {
    enumerable: true,
    get: function () {
      return (self._positionMin);
    }
  });

  /**
   * [Read-only] The maximum position that an output can travel to.
   * @property maximumPosition {Number}
   */
  Object.defineProperty(this, 'maximumPosition', {
    enumerable: true,
    get: function () {
      return (self._positionMax);
    }
  });

  /**
   * [Read-only] The minimum velocity that an output can be set to.
   * @property minimumVelocity {Number}
   */
  Object.defineProperty(this, 'minimumVelocity', {
    enumerable: true,
    get: function () {
      return (self._velocityMin);
    }
  });

  /**
   * [Read-only] The maximum velocity that an output can be set to.
   * @property maximumVelocity {Number}
   */
  Object.defineProperty(this, 'maximumVelocity', {
    enumerable: true,
    get: function () {
      return (self._velocityMax);
    }
  });

  /**
   * [Read-only] The minimum current that an output can be set to. Current limits are not
   * supported by all stepper controllers.
   *
   * @property minimumCurrent {Number}
   */
  Object.defineProperty(this, 'minimumCurrent', {
    enumerable: true,
    get: function () {
      return (self._currentMin);
    }
  });

  /**
   * [Read-only] The maximum current that an output can be set to. Current limits are not
   * supported by all stepper controllers.
   *
   * @property maximumCurrent {Number}
   */
  Object.defineProperty(this, 'maximumCurrent', {
    enumerable: true,
    get: function () {
      return (self._currentMax);
    }
  });

  /**
   * [read-only] An object containing information about the motor outputs of the device.
   * Here are a few examples of how to retrieve information in that object:
   *
   *     PhidgetStepper.outputs[5].currentPosition  // Motor 5's current position
   *     PhidgetStepper.outputs[5].stopped          // Is motor 5 stopped?
   *     PhidgetStepper.outputs.count               // Total number of outputs on the device
   *
   * @property outputs {Object}
   *
   * @property outputs.count {int} The total number of outputs on the device.
   *
   * @property outputs[int].position {Number} The position of the motor hooked up to that
   * output. This value remains between sessions. It is used when calculating the movement
   * needed to reach the target position. It can be manually set with `setPosition()`.
   *
   * @property outputs[int].targetPosition {Number} The last set target position.
   *
   * @property outputs[int].acceleration {Number} The last set acceleration value (also
   * used as deceleration value). This property should be set as part of initialization
   * because otherwise, it will remain unknown.
   *
   * @property outputs[int].currentLimit {Number} The last set current limit. Current
   * limit is not supported by all stepper controllers.
   *
   * @property outputs[int].current {Number} The actual current draw for the motor
   * connected to that output. Current sense is not supported by all stepper controllers.
   *
   * @property outputs[int].targetVelocity {Number} The desired velocity (speed) for the
   * motor on that output. Sometimes referred to as the "velocity limit".
   *
   * @property outputs[int].velocity {Number} The actual current velocity for the motor
   * on that output.
   *
   * @property outputs[int].engaged {Boolean} The engaged state. This is whether or not
   * the motor connected to the output is currently powered.
   *
   * @property outputs[int].stopped {Boolean} Whether the motor connected to that output
   * is currently stopped. If this is true, it indicates that the motor is not moving, and
   * there are no outstanding commands.
   *
   */
  this.outputs = {};

  /**
   * [read-only] An object containing information about the digital inputs of the
   * PhidgetStepper board. If `PhidgetStepper.inputs.count` equals 0, it simply means that
   * your board does not have any digital inputs.
   *
   *     PhidgetStepper.inputs[0].value  // Digital input 0's boolean value
   *     PhidgetStepper.outputs.count    // Number of digital inputs on the device
   *
   * @property inputs {Object}
   *
   * @property inputs.count {int} The total number of digital inputs on the device.
   *
   * @property outputs[int].value {Boolean} The current boolean value of the input.
   */
  this.inputs = {};

  /** @private */
  this._updateInterval = 8;

  /** @private */
  this._positionMin = undefined;

  /** @private */
  this._positionMax = undefined;

  /** @private */
  this._accelerationMin = undefined;

  /** @private */
  this._accelerationMax = undefined;

  /** @private */
  this._velocityMin = undefined;

  /** @private */
  this._velocityMax = undefined;

  /** @private */
  this._currentMin = undefined;

  /** @private */
  this._currentMax = undefined;

};

util.inherits(PhidgetStepper, Phidget);

/**
 * Starts or stops power from being sent to the motor connected to a specific output (or
 * array of outputs). By default, outputs do not power connected motors. Before moving
 * the motor, you must therefore engage the motor first.
 *
 * To reduce the motor's power consumption, you can disengage it once it's reached its
 * target position. If you are concerned about keeping accurate track of position, the
 * motor should not be disengaged until the motor is stopped.
 *
 * @method engageMotor
 *
 * @param index {int|Array} The motor's index number (or an array of motor numbers)
 * @param value {Boolean} The boolean status to use.
 *
 * @returns {PhidgetStepper} Returns the PhidgetStepper object to allow method chaining.
 *
 * @chainable
 */
PhidgetStepper.prototype.engageMotor = function(index, value) {

  var self = this;
  if (self.ready !== true) { return self; }

  index = [].concat(index);
  value = (value === true);

  for (var i = 0; i < index.length; i++) {

    var pos = parseInt(index[i]);
    if (!self.outputs[pos]) { self.outputs[pos] = {}; }
    self.outputs[pos].engaged = value;
    self._sendPck(self._makePckString('Engaged', pos), value ? 1 : 0, true);

  }

  return self;

};

/**
 * Sets the acceleration for the motor connected to the specified output. The motor will
 * both accelerate and decelarate at this rate. For the 1062 board, this is specified in
 * half-steps.
 *
 * The minimum and maximum acceleration values can be viewed in the `minimumAcceleration`
 * and `maximumAcceleration` properties.
 *
 * The acceleration should be explicitely set as part of initialization because otherwise
 * it will remain unknown.
 *
 * @method setAcceleration
 *
 * @param index {int|Array} The output's index number (or an array of output numbers)
 * @param [value] {Number} The desired acceleration specified in half-steps. If not
 * specified (or invalid), the maximum acceleration will be used.
 *
 * @returns {PhidgetStepper} Returns the PhidgetStepper to allow method chaining.
 *
 * @chainable
 */
PhidgetStepper.prototype.setAcceleration = function(index, value) {

  var self = this;
  if (self.ready !== true) { return self; }

  index = [].concat(index);
  value = parseFloat(value) || self._accelerationMax;

  for (var i = 0; i < index.length; i++) {

    var pos = parseInt(index[i]);
    if (!self.outputs[pos]) { self.outputs[pos] = {}; }
    self.outputs[pos].acceleration = value;
    self._sendPck(self._makePckString('Acceleration', pos), value, true);

  }

  return self;

};

/**
 * Sets the target speed (velocity) for the motor connected to the specified output (or
 * array of outputs). If the `targetVelocity` is set to 0, the motor will not move.
 *
 * Note that this is not necessarily the speed that the motor is being turned at. The
 * motor is accelerated towards the target velocity and then decelerated as it approaches
 * the target position. If the target position is close enough, it may never reach the
 * target velocity.
 *
 * @method setTargetVelocity
 *
 * @param index {int|Array} The output's index number (or an array of output numbers)
 * @param [value] {Number} The desired velocity specified in half-steps. If not specified
 * (or invalid), the maximum velocity will be used.
 *
 * @returns {PhidgetStepper} Returns the PhidgetStepper to allow method chaining.
 * @chainable
 */
PhidgetStepper.prototype.setTargetVelocity = function(index, value) {

  var self = this;
  if (self.ready !== true) { return self; }

  index = [].concat(index);
  value = parseFloat(value);
  if (isNaN(value)) { value =  self._velocityMax; }

  for (var i = 0; i < index.length; i++) {

    var pos = parseInt(index[i]);
    if (!self.outputs[pos]) { self.outputs[pos] = {}; }
    self.outputs[pos].targetVelocity = value;
    self._sendPck(self._makePckString('VelocityLimit', pos), value, true);

  }

  return self;

};

/**
 * Sets the current position of the motor connected to the specified output (or array of
 * outputs). Setting the position does not actually move the motor, it merely sets the
 * reference that will be used when moving to a target position.
 *
 * @method setPosition
 *
 * @param index {int|Array} The output's index number (or an array of output numbers).
 *
 * @param [value] {Number} The desired velocity specified in half-steps. If not specified
 * (or invalid), the maximum velocity will be used.
 *
 * @returns {PhidgetStepper} Returns the PhidgetStepper to allow method chaining.
 *
 * @chainable
 */
PhidgetStepper.prototype.setPosition = function(index, value) {

  var self = this;
  if (self.ready !== true) { return self; }

  index = [].concat(index);
  if (index < 0 || index >= self.outputs.count) {
    throw new Error("No such output.");
  }

  value = parseFloat(value);
  if (isNaN(value)) { value =  self._velocityMax; }

  for (var i = 0; i < index.length; i++) {

    var pos = parseInt(index[i]);
    if (!self.outputs[pos]) { self.outputs[pos] = {}; }
    self.outputs[pos].position = value;
    self._sendPck(self._makePckString('CurrentPosition', pos), value, true);

  }

  return self;

};

/**
 * Sets a new target position for the motor connected to the specified output. The motor
 * will immediately start moving towards this position.
 *
 * Note that calling `setTargetPosition()` will override a previous call to
 * `setTargetPosition()` and the motor will begin tracking to the new position
 * immediately. The velocity of the motor will be ramped appropriately.
 *
 * @method setTargetPosition
 * @param index {int|Array} The output's index number (or an array of output numbers)
 * @param [value=1000] {Number} The target position specified in half-steps.
 * @returns {PhidgetStepper} Returns the PhidgetStepper to allow method chaining.
 * @chainable
 */
PhidgetStepper.prototype.setTargetPosition = function(index, value) {

  var self = this;
  if (self.ready !== true) { return self; }

  index = [].concat(index);
  value = parseFloat(value);
  if (isNaN(value)) { value =  1000; }

  for (var i = 0; i < index.length; i++) {

    var pos = parseInt(index[i]);
    if (!self.outputs[pos]) { self.outputs[pos] = {}; }
    self.outputs[pos].targetPosition = value;
    self._sendPck(self._makePckString('TargetPosition', pos), value, true);

  }

  return self;

};

/**
 * Sets the upper current limit for the motor connected to the specified output. Note that
 * not all stepper controllers support current limiting.
 *
 * @method setCurrentLimit
 * @param index {int|Array} The output's index number (or an array of output numbers)
 * @param value {Number} The target position specified in half-steps.
 * @returns {PhidgetStepper} Returns the PhidgetStepper to allow method chaining.
 * @chainable
 */
PhidgetStepper.prototype.setCurrentLimit = function(index, value) {

  var self = this;
  if (self.ready !== true) { return self; }

  index = [].concat(index);
  value = parseFloat(value);

  for (var i = 0; i < index.length; i++) {

    var pos = parseInt(index[i]);
    if (!self.outputs[pos]) { self.outputs[pos] = {}; }
    self.outputs[pos].currentLimit = value;
    self._sendPck(self._makePckString('CurrentLimit', pos), value, true);

  }

  return self;

};

PhidgetStepper.prototype._setPhidgetSpecificInitialState = function () {};

/** @private See overridden method for details. */
PhidgetStepper.prototype._parsePhidgetSpecificData = function (data) {

  var self = this;

  if (data.keyword === 'AccelerationMin') {
    self._accelerationMin = parseFloat(data.value);
  } else if (data.keyword === 'AccelerationMax') {
    self._accelerationMax = parseFloat(data.value);
  } else if (data.keyword === 'CurrentMin') {
    self._currentMin = parseFloat(data.value);
  } else if (data.keyword === 'CurrentMax') {
    self._currentMax = parseFloat(data.value);
  } else if (data.keyword === 'PositionMin') {
    self._positionMin = parseFloat(data.value);
  } else if (data.keyword === 'PositionMax') {
    self._positionMax = parseFloat(data.value);
  } else if (data.keyword === 'VelocityMin') {
    self._velocityMin = parseFloat(data.value);
  } else if (data.keyword === 'VelocityMax') {
    self._velocityMax = parseFloat(data.value);

  } else if (data.keyword === 'NumberOfInputs') {
    self.inputs.count = parseInt(data.value);

  } else if (data.keyword === 'Input') {

    if (!self.inputs[data.index]) { self.inputs[data.index] = {}; }
    self.inputs[data.index].value = (data.value === '1');

    /**
     * Event emitted when digital input data is received.
     *
     * @event input
     * @param {PhidgetStepper} emitter The actual PhidgetStepper object that emitted the
     * event.
     * @param {Object} data An object containing the input data and related information
     * @param {int} data.index The input's index number
     * @param {Boolean} data.value The input's received value
     */
    self.ready && self.emit(
        "input",
        self,
        {
          "index": data.index,
          "value": self.inputs[data.index].value
        }
    );

  } else if (data.keyword === 'NumberOfMotors') {
    self.outputs.count = parseInt(data.value);

    // Reset reference position and (by the same token) target position. Also set 'engage'
    // status to false.
    for (var i = 0; i < data.value; i++) {
      self._sendPck(self._makePckString('CurrentPosition', i), 0, true);
      self._sendPck(self._makePckString('TargetPosition', i), 0, true);
      self._sendPck(self._makePckString('Engaged', i), 0, true);
    }

  } else if (data.keyword === 'CurrentPosition') {
    if (!self.outputs[data.index]) { self.outputs[data.index] = {}; }
    self.outputs[data.index].position = parseInt(data.value);

    /**
     * Event emitted to report that the position of a motor connected to one of the
     * board's outputs has changed.
     *
     * @event position
     * @param {PhidgetStepper} emitter The actual PhidgetStepper object that emitted the
     * event.
     * @param {Object} data An object containing information about the event.
     * @param {int} data.index The output's index number.
     * @param {Number} data.index The motor's new position.
     */
    self.ready && self.emit(
        "position",
        self,
        {
          "index": data.index,
          "position": self.outputs[data.index].position
        }
    );

  } else if (data.keyword === 'TargetPosition') {
    if (!self.outputs[data.index]) { self.outputs[data.index] = {}; }
    self.outputs[data.index].targetPosition = parseInt(data.value);

  } else if (data.keyword === 'Acceleration') {
    if (!self.outputs[data.index]) { self.outputs[data.index] = {}; }
    self.outputs[data.index].acceleration = parseFloat(data.value);

  } else if (data.keyword === 'CurrentLimit') {
    if (!self.outputs[data.index]) { self.outputs[data.index] = {}; }
    self.outputs[data.index].currentLimit = parseFloat(data.value); // value larger than int's maximum

  } else if (data.keyword === 'Current') {
    if (!self.outputs[data.index]) { self.outputs[data.index] = {}; }
    self.outputs[data.index].current = parseFloat(data.value);
    // dispatch event ?!

  } else if (data.keyword === 'VelocityLimit') {
    if (!self.outputs[data.index]) { self.outputs[data.index] = {}; }
    self.outputs[data.index].targetVelocity = parseFloat(data.value);

  } else if (data.keyword === 'Velocity') {
    if (!self.outputs[data.index]) { self.outputs[data.index] = {}; }
    self.outputs[data.index].velocity = parseFloat(data.value);
    // dispatch event ?!

  } else if (data.keyword === 'Engaged') {
    if (!self.outputs[data.index]) { self.outputs[data.index] = {}; }
    self.outputs[data.index].engaged = (parseInt(data.value) === 1);

  } else if (data.keyword === 'Stopped') {
    if (!self.outputs[data.index]) { self.outputs[data.index] = {}; }

    // The board continuously reports that the board is NOT stopped. To trigger the event
    // the last time only, we must check if the value is different
    if (self.outputs[data.index].stopped === (parseInt(data.value) === 1)) {
      return;
    }

    self.outputs[data.index].stopped = (parseInt(data.value) === 1);

    // The order is important. "target" event must be dispatched before start and stop
    // events.
    if (
        self.outputs[data.index].stopped &&
        self.outputs[data.index].position ===
        self.outputs[data.index].targetPosition
    ) {

      /**
       * Event emitted when a motor connected to one of the board's outputs has reached
       * its target position.
       *
       * @event target
       * @param {PhidgetStepper} emitter The actual PhidgetStepper object that emitted the
       * event.
       * @param {Object} data An object containing information about the event.
       * @param {int} data.index The output's index number.
       * @param {int} data.position The motor's position
       */
      self.ready && self.emit(
          "target",
          self,
          {
            "index": data.index,
            "position": self.outputs[data.index].position
          }
      );

    }

    /**
     * Event emitted when a motor connected to one of the board's outputs starts moving.
     *
     * @event start
     * @param {PhidgetStepper} emitter The actual PhidgetStepper object that emitted the
     * event.
     * @param {Object} data An object containing information about the event.
     * @param {int} data.index The output's index number.
     */
    /**
     * Event emitted when a motor connected to one of the board's outputs stops moving.
     *
     * @event stop
     * @param {PhidgetStepper} emitter The actual PhidgetStepper object that emitted the
     * event.
     * @param {Object} data An object containing information about the event.
     * @param {int} data.index The output's index number.
     */
    self.ready && self.emit(
        self.outputs[data.index].stopped ? "stop" : "start",
        self,
        {
          "index": data.index,
          "position": self.outputs[data.index].position
        }
    );

  }

};

module.exports.PhidgetStepper = PhidgetStepper;









/****************************************************************************************/
/************************************  PhidgetRFID  *************************************/
/****************************************************************************************/

/**
 * The `PhidgetRFID` class allows you to use a PhidgetRFID board to read and write (if the board
 * supports if) RFID tags. The PhidgetRFID board supports 3 protocols:
 *
 *  - EM4100/EM4102 40-bit
 *  - ISO11785 FDX-B encoding, Animal ID
 *  - PhidgetsTAG Protocol 24 character ASCII
 *
 * Please note that the antenna must be activated for the `PhidgetRFID` to report tag reads. Here's
 * an example of how to use this object to read from a tag:
 *
 *     var phidgets = require("Phidgets");
 *
 *     var pRFID = new phidgets.PhidgetRFID()
 *         .on('opened', function(emitter, data) {
 *             emitter.antenna = true;
 *             console.log("Device ready. Antenna activated.");
 *         })
 *         .open();
 *
 * This object extends the `Phidget` object which itself extends Node.js'
 * [`events.EventEmitter` object](https://nodejs.org/api/events.html#events_class_events_eventemitter).
 * See that object's documentation for inherited methods.
 *
 * @class PhidgetRFID
 * @constructor
 * @extends Phidget
*/
var PhidgetRFID = function() {

 PhidgetRFID.super_.call(this, "PhidgetRFID");

 var self = this;

  // Define some "static" properties
  Object.defineProperties(this, {

    /**
     * [read-only] Array of all protocols supported by the device.
     *
     * @property SUPPORTED_PROTOCOLS
     * @type Array
     * @static
     */
    SUPPORTED_PROTOCOLS: {
      value: [undefined, "EM4100", "ISO11785 FDX-B", "PhidgetTag"],
      writable: false,
      enumerable: true,
      configurable: false
    }

  });

 /**
  * [read-only] An object containing information about the digital outputs of the device.
  * Output 0 is also labeled on the board as "+5V". Output 1 is also labeled on the board
  * as "LED". This is not to be confused with the onboard LED. To control the onboard
  * LED, please use the `PhidgetRFID.led` property.
  *
  * Here is how to retrieve an output's value or the total number of outputs:
  *
  *     PhidgetRFID.outputs[1].value     // Output 1 current value
  *     PhidgetRFID.outputs.count        // Total number of outputs on the device
  *
  * @property outputs {Object}
  * @property outputs.count {int} The total number of outputs on the device.
  * @property outputs[int].value {int} The current value of the specified output.
  */
 this.outputs = {};

 /**
  * [read-only] Status of the reader. The two possible statuses are:
  *
  *   - waiting: no tag is being detected because none are present or because the antenna is off
  *   - detecting: a tag is currently being detected
  *
  * @property status {String}
  */
 this.status = "waiting";

 /**
  * [read-only] An object containing information about the last tag that was read.
  *
  * @property tag {Object}
  * @property tag.value {int} The tag's value.
  * @property tag.protocol {int} The tag's protocol.
  * @property tag.detectedAt {Date} A `Date` object representing the moment when the tag was read.
  * @property tag.lostAt {Date} A `Date` object representing the moment when the previously read
  * tag was lost.
  */
 this.tag = {
   value: 0,
   protocol: 0,
   detectedAt: undefined,
   lostAt: undefined
 };

 /**
  * The status of the onboard LED (not to be confused with the LED output). Setting this
  * property to `true` will turn on the onboard LED while setting it to `false` will turn it
  * off.
  *
  * @property led {Boolean}
  */
 Object.defineProperty(this, 'led', {
   enumerable: true,
   get: function () {
     return (self._led);
   },
   set: function(value) {
     self._sendPck(self._makePckString('LEDOn'), value ? 1 : 0, true);
     self._led = !!value;
   }
 });

 /**
  * The activity status of the RFID antenna. The antenna must be activated in order for
  * the device to work properly. Setting this property to `true` activates the antenna
  * while setting it to `false` deactivates it.
  *
  * @property antenna {Boolean}
  */
 Object.defineProperty(this, 'antenna', {
   enumerable: true,
   get: function () {
     return (self._antenna);
   },
   set: function(value) {
     self._sendPck(self._makePckString('AntennaOn'), value ? 1 : 0, true);
     self._antenna = !!value;
   }

 });

 this._led = false;
 this._antenna = false;

};

util.inherits(PhidgetRFID, Phidget);


PhidgetRFID.prototype._parsePhidgetSpecificData = function (data) {

 var self = this;

 if (data.keyword === "NumberOfOutputs") {

   self.outputs.count = parseInt(data.value);

 } else if (data.keyword === "LastTag") {

   self.tag.protocol = self.SUPPORTED_PROTOCOLS[data.value.split("/", 2)[0]];
   self.tag.value = data.value.split("/", 2)[1];
   self.tag.detectedAt = undefined;
   self.tag.lostAt = undefined;

 } else if (data.keyword === "Tag2") {

   self.tag.protocol = self.SUPPORTED_PROTOCOLS[data.value.split("/", 2)[0]];
   self.tag.value = data.value.split("/", 2)[1];
   self.tag.detectedAt = new Date();
   self.tag.lostAt = undefined;

   /**
    * Event emitted when a tag has been detected.
    *
    * @event detected
    * @param {PhidgetRFID} emitter The actual PhidgetRFID object that emitted the event.
    * @param {Object} tag
    * @param {Number} tag.protocol The tag's protocol. Supported protocols are: `ISO11785 FDX-B`,
    * `EM4100` and `PhidgetTag`.
    * @param {String} tag.value The tag's value.
    * @param {Date} tag.detectedAt The date and time when the tag was detected.
    * @param {Date} tag.lostAt The date and time when the tag was lost.
    */
   self.ready && self.emit("detected", self, self.tag);


 } else if (data.keyword === "TagLoss2") {

   self.tag.protocol = self.SUPPORTED_PROTOCOLS[data.value.split("/", 2)[0]];
   self.tag.value = data.value.split("/", 2)[1];
   self.tag.lostAt = new Date();

   /**
    * Event emitted when a previously detected tag is now lost
    *
    * @event lost
    * @param {PhidgetRFID} emitter The actual PhidgetRFID object that emitted the event.
    * @param {Object} tag
    * @param {Number} tag.protocol The tag's protocol. Supported protocols are: `ISO11785 FDX-B`,
    * `EM4100` and `PhidgetTag`.
    * @param {String} tag.value The tag's value.
    * @param {Date} tag.detectedAt The date and time when the tag was detected.
    * @param {Date} tag.lostAt The date and time when the tag was lost.
    */
   self.ready && self.emit("lost", self, self.tag);

 } else if (data.keyword === "TagState") {

   self.status = (data.value === '1') ? "detecting" : "waiting";

   /**
    * Event emitted when the device's status changes.
    *
    * @event status
    * @param {PhidgetRFID} emitter The actual PhidgetRFID object that emitted the event.
    * @param {String} status Status of the device (`detecting` or `waiting`).
    */
   self.emit(
     "status",
     self,
     self.status
   );

 } else if (data.keyword === "AntennaOn") {

   self._antenna = (data.value === '1');

   /**
    * Event emitted when the antenna's status changes.
    *
    * @event antenna
    * @param {PhidgetRFID} emitter The actual PhidgetRFID object that emitted the event.
    * @param {Boolean} status Status of the antenna. `true` means it is now "on" and `false` means
    * it is now "off".
    */
   self.emit(
     "antenna",
     self,
     self._led
   );

 } else if (data.keyword === "LEDOn") {

   self._led = (data.value === '1');

   /**
    * Event emitted when the onboard LED's status changes.
    *
    * @event led
    * @param {PhidgetRFID} emitter The actual PhidgetRFID object that emitted the event.
    * @param {Boolean} status Status of the LED. `true` means it is now "on" and `false` means it is
    * now "off".
    */
   self.emit(
     "led",
     self,
     self._led
   );

 } else if (data.keyword === "Output") {

   if (!self.outputs[data.index]) { self.outputs[data.index] = {}; }
   self.outputs[data.index].value = (data.value === '1');

   /**
    * Event emitted when an output's status has changed.
    *
    * @event output
    * @param {PhidgetRFID} emitter The actual PhidgetRFID object that emitted the event.
    * @param {Object} data An object containing the output data and related information
    * @param {int} data.index The output's index number
    * @param {int} data.value The output's new value
    */
   self.emit(
     "output",
     self,
     { "index": data.index, "value": self.outputs[data.index].value }
   );

 }

};

/**
 * Sets the specified output to active (`true`) or inactive (`false`). This method should only
 * be used after the board is 'opened'. Calling it before will fail silently.
 *
 * @method setOutput
 * @param index {int|Array} The output number to set (or array of output numbers)
 * @param [value=false] {Boolean} The value you wish to set the output to.
 * @returns {PhidgetRFID} Returns the `PhidgetRFID` object to allow method chaining.
 * @chainable
 */
PhidgetRFID.prototype.setOutput = function(index, value) {

  // var self = this;
  if (this.ready !== true) { return this; }

  index = [].concat(index);
  value = (value === true);
  var vOut = (value === true) ? 1 : 0;

  for (var i = 0; i < index.length; i++) {
    var pos = parseInt(index[i]);
    if (!this.outputs[pos]) { this.outputs[pos] = {}; }
    this.outputs[pos].value = value;
    this._sendPck(this._makePckString('Output', pos), vOut, true);
  }

  return this;

};

/**
 * Writes a tag. Please note that not all devices have write capacity. This method will be silently
 *
 * @method write
 * @param tag {String} The value that should be written to the card.
 * @param protocol {Number=1} An integer identifying the protocol to be used. 1 is EM4100, 2 is
 * ISO11785 FDX-B and 3 is PhidgetTag. Default is EM4100.
 * @param lock {Boolean=false} Whether the card should be prevented from being written again.
 * Default is false.
 *
 * @returns {PhidgetRFID} Returns the `PhidgetRFID` object to allow method chaining.
 * @chainable
 */
PhidgetRFID.prototype.write = function(tag, protocol, lock) {

  var intLock = (lock === true) ? 1 : 0;
  protocol = parseInt(protocol);
  if ( !(protocol >= 1 && protocol <= 3) ) { protocol = 1; }

  var write = protocol + "/" + intLock + "/" + tag;
  this._sendPck(this._makePckString('WriteTag'), write, true);

  return this;

};

module.exports.PhidgetRFID = PhidgetRFID;









/****************************************************************************************/
/*****************************  PhidgetTemperatureSensor  *******************************/
/****************************************************************************************/

/**
 * The `PhidgetTemperatureSensor` class allows you receive data from PhidgetTemperatureSensor
 * boards.
 *
 * As of this writing, this class has only been tested with a
 * [1048_0 - PhidgetTemperatureSensor 4-input](http://www.phidgets.com/products.php?product_id=1048),
 * but should be compatible with any PhidgetTemperatureSensor board.
 * 
 * ```JavaScript
 * var PhidgetTemperatureSensor = require('phidgets').PhidgetTemperatureSensor;
 * 
 * var pts = new PhidgetTemperatureSensor();
 * 
 * function onReady() {
 * 
 *    var inputIndex = 0;
 *    
 *    // set the ThermocoupleType to K
 *    pts.setThermocoupleType(inputIndex, PhidgetTemperatureSensor.THERMOCOUPLE_TYPES.TYPE_K);
 * 
 *    // receive temperature events when the temperature changes by at least 2 degrees Celsius
 *    // (default is 0.5)
 *    pts.setTemperatureChangeTrigger(inputIndex, 2);
 *    
 *    pts.on('temperature', function (emitter, data) {
 *      if (data.index === inputIndex) {
 *        console.log('Temperature: ' + data.value);
 *      }
 *    });
 * 
 * }
 * 
 * pts.addListener('opened', onReady);
 * 
 * pts.open();
 * ```
 * 
 * This object extends the `Phidget` object which itself extends Node.js'
 * [`events.EventEmitter` object](https://nodejs.org/api/events.html#events_class_events_eventemitter).
 * See that object's documentation for more inherited methods and properties.
 *
 * @class PhidgetTemperatureSensor
 * @constructor
 * @extends Phidget
 * @author Andrew Berger <andrew@andrewberger.net>
 */
var PhidgetTemperatureSensor = function() {
  PhidgetTemperatureSensor.super_.call(this, 'PhidgetTemperatureSensor');

  var self = this;

  /**
   * [read-only] The last known ambient temperature of the sensor (where the inputs connect to the
   * board), in degrees celsius.
   * 
   * @property ambientTemperature {Number}
   * @instance
   */
  Object.defineProperty(this, 'ambientTemperature', {
    enumerable: true,
    get: function() {
      return self._ambientTemperature;
    }
  });

  /**
   * [read-only] The highest possible ambient temperature value which can be returned by the sensor,
   * in degrees celsius.
   * 
   * @property ambientTemperatureMax {Number}
   * @instance
   */
  Object.defineProperty(this, 'ambientTemperatureMax', {
    enumerable: true,
    get: function() {
      return self._ambientTemperatureMax;
    }
  });

  /**
   * [read-only] The lowest possible ambient temperature value which can be returned by the sensor,
   * in degrees celsius.
   * 
   * @property ambientTemperatureMin {Number}
   * @instance
   */
  Object.defineProperty(this, 'ambientTemperatureMin', {
    enumerable: true,
    get: function() {
      return self._ambientTemperatureMin;
    }
  });

  /**
   * [read-only] An object containing data about each input on the device.
   *
   * @property inputs {Object}
   * 
   * @property inputs.count {int} The number of inputs available on the device.
   * 
   * @property inputs[int].temperature {Number} The input's last known temperature in degrees
   * celsius.
   * 
   * @property inputs[int].temperatureMax {Number} The highest temperature possible for the given
   * input, based on thermocouple type.
   * 
   * @property inputs[int].temperatureMin {Number} The lowest temperature possible for the given
   * input, based on thermocouple type.
   * 
   * @property inputs[int].trigger {Number} The input's temperature change trigger, in
   * degrees celsius.
   * 
   * @property inputs[int].potential {Number} The input's last known voltage.
   * 
   * @property inputs[int].potentialMax {Number} The highest voltage possible for the given input,
   * based on thermocouple type.
   * 
   * @property inputs[int].potentialMin {Number} The lowest voltage possible for the given input,
   * based on thermocouple type.
   * 
   * @property inputs[int].thermocoupleType {int} The type of thermocouple attached to the given
   * input. Value corresponds to a value from PhidgetTemperatureSensor.THERMOCOUPLE_TYPES.
   */
  this.inputs = {};

  /** @private */
  this._ambientTemperature = undefined;

  /** @private */
  this._ambientTemperatureMax = undefined;

  /** @private */
  this._ambientTemperatureMin = undefined;

};

util.inherits(PhidgetTemperatureSensor, Phidget);


/**
 * [read-only] An enum of supported thermocouple types. Support for other thermocouple types, and
 * voltage sources other than thermocouples in the valid range (between potentialMin and
 * potentialMax) can be achieved using potential.
 * 
 * @property THERMOCOUPLE_TYPES {Object}
 * @property THERMOCOUPLE_TYPES.TYPE_K {int} Integer value represent a K-type thermocouple.
 * @property THERMOCOUPLE_TYPES.TYPE_J {int} Integer value represent a J-type thermocouple.
 * @property THERMOCOUPLE_TYPES.TYPE_E {int} Integer value represent a E-type thermocouple.
 * @property THERMOCOUPLE_TYPES.TYPE_T {int} Integer value represent a T-type thermocouple.
 */
Object.defineProperty(PhidgetTemperatureSensor, 'THERMOCOUPLE_TYPES', {
  enumerable: true,
  writable: false,
  value: {
    TYPE_K: 1,
    TYPE_J: 2,
    TYPE_E: 3,
    TYPE_T: 4
  }
});

/** @private */
Object.defineProperty(PhidgetTemperatureSensor, '_thermocoupleTypesArray', {
  writable: false,
  value: [
    PhidgetTemperatureSensor.THERMOCOUPLE_TYPES.TYPE_J,
    PhidgetTemperatureSensor.THERMOCOUPLE_TYPES.TYPE_K,
    PhidgetTemperatureSensor.THERMOCOUPLE_TYPES.TYPE_E,
    PhidgetTemperatureSensor.THERMOCOUPLE_TYPES.TYPE_T
  ]
});

/**
 * Sets the change trigger for an input. This is the amount by which the sensed temperature must
 * change between temperature change events. By default this is set to 0.5. Setting trigger
 * to 0 will cause all temperature updates to fire events. This is helpful for applications that are
 * implementing their own filtering.
 * 
 * @method setTemperatureChangeTrigger
 * @param index {int|Array} The input's number (or an array of input numbers)
 * @param value {Number} The TemperatureChangeTigger value to set
 * @returns {PhidgetTemperatureSensor} Returns the PhidgetTemperatureSensor to allow method
 * chaining.
 * @chainable
 */
PhidgetTemperatureSensor.prototype.setTemperatureChangeTrigger = function(index, value) {

  var self = this;
  if (self.ready !== true) { return self; }

  value = Number(value);

  if (isNaN(value) || value < 0) {
    throw new Error('Trigger must be a floating-point number greater than or equal to 0');
  }

  index = [].concat(index);

  for (var i = 0; i < index.length; i++) {
    var pos = Number(index[i]);
    if (!self.inputs[pos]) { self.inputs[pos] = {}; }
    self.inputs[pos].temperatureChangeTrigger = value;
    self._sendPck(self._makePckString('Trigger', pos), value, true);
  }

  return self;
};


/**
 * Sets the thermocouple type for an input. The possible values are 'J', 'K', 'E', and 'T', or one
 * of the values in the PhidgetTemperatureSensor.THERMOCOUPLE_TYPES enum. Support for other
 * thermocouple types, and voltage sources other than thermocouples in the valid range (between
 * potentialMin and potentialMax) can be achieved using potential.
 * 
 * @method setThermocoupleType
 * @param index {int|Array} The input's index (or an array of input indices)
 * @param value {string|Number} The ThermocoupleType to set
 * @returns {PhidgetTemperatureSensor} Returns the PhidgetTemperatureSensor to allow method
 * chaining.
 * @chainable
 */
PhidgetTemperatureSensor.prototype.setThermocoupleType = function(index, value) {

  var self = this;
  if (self.ready !== true) { return self; }

  if (typeof value === 'string') {
    var propName = 'TYPE_' + value.toUpperCase();
    if (!PhidgetTemperatureSensor.THERMOCOUPLE_TYPES.hasOwnProperty(propName)) {
      throw new Error('Unsupported thermocouple type: `' + value + '`');
    }

    value = PhidgetTemperatureSensor.THERMOCOUPLE_TYPES[propName];
  } else {
    value = Number(value);

    if (isNaN(value) || (PhidgetTemperatureSensor._thermocoupleTypesArray.indexOf(value) < 0)) {
      throw new Error('ThermocoupleType must be one of PhidgetTemperatureSensor.THERMOCOUPLE_TYPES');
    }
  }

  index = [].concat(index);

  for (var i = 0; i < index.length; i++) {
    var pos = Number(index[i]);
    if (!self.inputs[pos]) { self.inputs[pos] = {}; }
    self.inputs[pos].thermocoupleType = value;
    self._sendPck(self._makePckString('ThermocoupleType', pos), value, true);
  }

  return self;
};

/** @private See overridden method for details. */
PhidgetTemperatureSensor.prototype._parsePhidgetSpecificData = function (data) {
  
  var self = this;

  // keywords which should result in an emitted event
  var emittableEvents = [

    // @TODO is this event necessary?
    /**
     * The sensor's ambient temperature has changed.
     *
     * @event ambientTemperature
     * @param {PhidgetTemperatureSensor} emitter The actual PhidgetTemperatureSensor object that
     * emitted the event.
     * @param {Object} data An object containing the sensor data and related information
     * @param {Number} data.value The sensor's new ambient temperature.
     */
    'AmbientTemperature',

    /**
     * The calculated temperature of the given input has changed by more than
     * temperatureChangeTrigger. This value is dependent on the sensor's ambient temperature, the
     * input's thermocouple type, and the input's potential.
     *
     * @event temperature
     * @param {PhidgetTemperatureSensor} emitter The actual PhidgetTemperatureSensor object that
     * emitted the event.
     * @param {Object} data An object containing the sensor data and related information
     * @param {int} data.index The input's index number
     * @param {Number} data.value The input's new temperature.
     */
    'Temperature',

    // @TODO it may be useful to return the last known AmbientTemperature with this event, as its
    // most likely use is in calculating temperature from a voltage source other than a J K E or T thermocouple.
    /**
     * The potential (voltage) of the given input has changed.
     *
     * @event potential
     * @param {PhidgetTemperatureSensor} emitter The actual PhidgetTemperatureSensor object that
     * emitted the event.
     * @param {Object} data An object containing the sensor data and related information
     * @param {int} data.index The input's index number
     * @param {Number} data.value The input's new potential.
     */
    'Potential'
  ];

  // keywords which relate to a specific input, and have a useful data.index value
  var inputSpecificEvents = [
    'Temperature',
    'TemperatureMax',
    'TemperatureMin',
    'Potential',
    'PotentialMax',
    'PotentialMin',
    'ThermocoupleType',
    'Trigger'
  ];

  // emitted event names and properties on each input must be camelCase
  var camelizedKeyword = data.keyword.charAt(0).toLowerCase() + data.keyword.slice(1);

  // the value emitted by an emittableEvent
  var eventData = {
    value: Number(data.value)
  };

  if (data.keyword === 'AmbientTemperature') {
    self._ambientTemperature = eventData.value;

  } else if (data.keyword === 'AmbientTemperatureMax') {
    self._ambientTemperatureMax = eventData.value;

  } else if (data.keyword === 'AmbientTemperatureMin') {
    self._ambientTemperatureMin = eventData.value;

  } else if (data.keyword === 'NumberOfSensors') {
    self.inputs.count = eventData.value;

  } else if (inputSpecificEvents.indexOf(data.keyword) >= 0) {
    if (!self.inputs[data.index]) { self.inputs[data.index] = {}; }

    eventData.index = data.index;

    self.inputs[data.index][camelizedKeyword] = eventData.value;

  } else {
    // unhandled event
    return;
  }

  if (self.ready && (emittableEvents.indexOf(data.keyword) >= 0)) {
    self.emit(camelizedKeyword, self, eventData);
  }
};

module.exports.PhidgetTemperatureSensor = PhidgetTemperatureSensor;
