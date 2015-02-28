'use strict';

/**
 * The Phidgets library blah, blah, blah...
 *
 * @module phidgets
 *
 *
 *
 * @todo add support for connecting to a board by label.
 * @todo add support for authentication
 * @todo complete close function
 * @todo understand what lid0 does ?!
 * @todo implement a decent toString() method
 * @todo add name property http://www.phidgets.com/documentation/web/NETDoc/html/892b25b3-75f7-7808-0ae3-d63d9141a8fc.htm
 *
 *
 * done: chainable, timeout if no connection, module
 */
var phidgets = {

  /**
   * Version of this library
   *
   * @property version
   * @type String
   */
  version: "0.5.0"
};


// Dependencies
var net = require('net');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

/**
 * The Phidget class is the base class from which all specific phidgets inherit...
 *
 * @class Phidget
 * @constructor
 */
var Phidget = function() {

  this.data = { inputs: {}, sensors: {}, outputs: {} };
  this.ready = false;
  this.reconnect = true;
  this.host =     "127.0.0.1";
  this.port =     5001;
  this.serial =   undefined;
  //this.label =  undefined;
  //this.password = null;
  this.type = "PhidgetInterfaceKit";

  // Private
  this._client = null;
  this._randomId = Math.floor(Math.random() * 99999);
  this._socketDataString = '';
  this._protocol = "1.0.10";
  this._delimiter = '\r\n';
  this._connectWaitTimer = undefined;
  this._reconnectionDelay = 200;

  this._readyWaitTimeout = 200;
  this._readyCheckCount = 0;
  this._maxReadyCheckCount = 5;

  //this._reconnectCount = 0;
  //this._maxReconnectionAttempts = 5;

  return this;

};

util.inherits(Phidget, EventEmitter);

Phidget.prototype.open = function(options) {

  var self = this;

  self._connectCount++;

  options = options || {};
  //this.host = options.host || this.host;
  //this.port = options.port || this.port;
  //this.serial = options.serial || this.serial;
  if (options.host)   { this.host = options.host; }
  if (options.port)   { this.port = options.port; }
  if (options.serial) { this.serial = options.serial; }
  //this.label = options.label || this.label;
  //this.password = options.password || this.password;

  /**
   * Event emitted when an attempt to open a Phidget has been initiated.
   *
   * @event opening
   * @param {Phidget} emitter The actual Phidget object that emitted the event.
   */
  self.emit('opening', self);

  self._client = net.createConnection(self.port, self.host, function() {

    self._client.setEncoding('utf8');
    self._client.setKeepAlive("enable", 10000);

    self._client.on('end', function() {
      self._handleConnectionEnd(self);
    });

    self._client.on('close', function() {
      self._handleConnectionEnd(self);
    });

    self._client.on('data', function(d) {
      self._handleData(d, self);
    });

    //self._connectWaitTimer = setTimeout(self._checkReady, self._readyWaitTimeout, self);
    self._client.write("995 authenticate, version=" + self._protocol + self._delimiter);
    self._client.write("report 8 report" + self._delimiter);

    // Open message
    var message  = "set /PCK/Client/0.0.0.0/" + self._randomId.toString();
    message     += "/" + self.type;

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
    //self._client.write("listen /PSK/PhidgetInterfaceKit lid0" + self._delimiter);
    self._client.write("listen /PSK/" + self.type + " lid0" + self._delimiter);

  });

  // For whatever reason, this needs to be called from outside
  self._client.on('error', function(e) {
    /**
     * Event emitted when an error occurs while trying to connect to the Phidget web
     * service.
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
  });

  return self;

};

Phidget.prototype.close = function(){
  var self = this;
  self.reconnect = false;
  self._client.write("quit\r\n");
  return self;
};

Phidget.prototype.setOutput = function(output, value){
  var self = this;

  if(self.ready !== true){
    throw new Error('The board is not ready!');
  }

  if(value === true){ value = 1; }
  if(value === false){ value = 0; }
  output = parseInt(output);
  value = parseInt(value);

  if(value === 1 || value === 0){
    var msg = 'set /PCK/' + this.type + '/' + this.serial;
    msg += '/Output/' + output + '="' + value + '"' + this._delimiter;
    self._client.write(msg);
    self.data.outputs[output] = value;
  }else{
    throw new Error('digital input must be true/false or 1/0');
  }

  return self;

};

//Phidget.prototype._checkReady = function(self){
//
//  if(self === undefined) { self = this; }
//
//  clearTimeout(self._connectWaitTimer);
//
//  if(self.ready === false) {
//
//    // We will wait some more but eventually we throw an error
//    if (self._readyCheckCount >= self._maxReadyCheckCount) {
//
//      // Prepare error
//      var err = new Error('The connection attempt timed out.');
//      err.address = self.host;
//      err.code = 'ECONNTIMEOUT';
//      err.errno = 'ECONNTIMEOUT';
//      err.port = self.port;
//
//      /**
//       * Event emitted when a connection attempt times out.
//       *
//       * @event timeout
//       * @param {Phidget} emitter The actual object that emitted the event.
//       * @param {Error} error The error object
//       * @param {String} error.address The network address
//       * @param {String} error.code The error code
//       * @param {String} error.errno The error number
//       * @param {String} error.message The error message
//       * @param {String} error.port The network port
//       */
//      self.emit('timeout', self, err);
//
//    } else {
//      self._readyCheckCount++;
//      self._connectWaitTimer = setTimeout(self._checkReady, self._readyWaitTimeout, self);
//    }
//
//  } else {
//
//    /**
//     * Event emitted when a phidget device has been successfully opened.
//     *
//     * @event opened
//     * @param {Phidget} emitter The actual object that emitted the event.
//     */
//    self.emit('opened', self);
//    self._readyCheckCount = 0;
//
//  }
//
//};

Phidget.prototype._handleConnectionEnd = function(self) {

  self._client.removeAllListeners(['end', 'close', 'error', 'data']);
  //clearTimeout(self._connectWaitTimer);
  self._client.destroy();
  self.ready = false;

  /**
   * Event emitted when the connection to a phidget has been closed.
   *
   * @event closed
   * @param {Phidget} emitter The actual object that emitted the event.
   */
  self.emit('closed', self);

  if(self.reconnect === true){
    setTimeout(function() {self.connect();}, self._reconnectionDelay);
  }
};

Phidget.prototype._handleData = function(chunk, self) {

  var index, line;

  chunk = chunk.toString('utf8');
  self._socketDataString += chunk;

  while( (index = self._socketDataString.indexOf('\n')) > -1 ) {

    line = self._socketDataString.slice(0, index);
    self._socketDataString = self._socketDataString.slice(index + 1);
    line = line.replace(/\u0000/gi, "");
    line = line.replace(/\u0001/gi, "");
    self.emit('line', line);
    self._parseLineInput(line, self);

  }

};



Phidget.prototype._parseLineInput = function(line, self) {

  var err;


  //    200 set successful
  //    200 inter-report period adjusted to 8ms.
  //    200 listening, id lid0
  //    996 No need to authenticate, version=1.0.10
  //    report 200-periodic report follows:
  //    report 200-lid0 is pending, key /PSK/PhidgetInterfaceKit/mylabel/48587/Name latest value "1" (added)

  // Split on spaces
  var status = line.split(" ")[0];

  if (status === 'report') {

    self._parseReport(line, self);

  } else if(status === '200') {

    // Positive response. Nothing to do.

  } else if(status === '994') { // Version mismatch

    err = new Error('Protocol version mismatch.', 'PROTOCOLMISMATCH');
    err.details = line;
    self.emit('error', err);

  } else if(status === '996') { // Authenticated or no authentication necessary

    if (self.ready === false) {
      self.ready = true;
      self.emit("opened", self);
    }

  } else if(status === '998') { // Authentication failed

    err = new Error('Authentication failed', 'AUTHFAILED');
    err.details = line;
    self.emit('error', err);

  } else if(status === '999') { // Authentication required

    // to complete!

  }




  //if(words[0] === "report" && words[4] === 'key') {
  //
  //  // This is the slash separated string broken down
  //  var pathParts = words[5].split('/');
  //  var label   = parseInt(pathParts[3]);
  //  var serial   = parseInt(pathParts[4]);
  //  var type      = pathParts[5];
  //  var number    = parseInt(pathParts[6]);
  //  var value     = parseInt(words[8].replace('"',""));
  //
  //  if (self.serial === undefined) {
  //    self.serial = serial;
  //  }
  //
  //  if(type === "Input"){
  //    self.data.inputs[number] = value;
  //    self.emit("input", serial, number, value);
  //  } else if(type === "Sensor"){
  //    self.data.sensors[number] = value;
  //    self.emit("sensor", serial, number, value);
  //  } else if(type === "Output"){
  //    self.data.outputs[number] = value;
  //    self.emit("output", serial, number, value);
  //  }
  //
  //} else if(words[0] === '994') {
  //  self.emit('error', line);
  //}

  //if (self.ready === false && line === "report 200-that's all for now") {
  //  self.ready = true;
  //  self.emit("opened");
  //}

};



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
  // More examples:
  //
  //    report 200-lid0 is pending, key /PSK/PhidgetInterfaceKit/mylabel/48587/Name latest value "Phidget InterfaceKit 8/8/8" (added)
  //    report 200-lid0 is pending, key /PSK/PhidgetInterfaceKit/mylabel/48587/DataRateMax latest value "16" (added)
  //    report 200-lid0 is pending, key /PSK/PhidgetInterfaceKit/mylabel/48587/DataRateMin latest value "1000" (added)
  //    report 200-lid0 is pending, key /PSK/PhidgetInterfaceKit/mylabel/48587/InitKeys latest value "61" (added)
  //    report 200-lid0 is pending, key /PSK/PhidgetInterfaceKit/mylabel/48587/InterruptRate latest value "8" (added)
  //    report 200-lid0 is pending, key /PSK/PhidgetInterfaceKit/mylabel/48587/ID latest value "69" (added)
  //    report 200-lid0 is pending, key /PSK/PhidgetInterfaceKit/mylabel/48587/NumberOfOutputs latest value "8" (added)
  //    report 200-lid0 is pending, key /PSK/PhidgetInterfaceKit/mylabel/48587/NumberOfSensors latest value "8" (added)
  //    report 200-that's all for now

  var infos = line.split("/").slice(1);

  if (!self.serial) {
    self.serial = parseInt(infos[3]);
  }

  //if (self.label === undefined) {
  //  self.label = infos[2];
  //}

  var type = infos[4];

  if (type === 'Input' || type === 'Output' || type === 'Sensor') {

    var parts = infos[5].split(" ");
    var index = parseInt(parts[0]);
    var value = parseInt(parts[3].replace('"',""));

    if (type === "Input"){

      self.data.inputs[index] = value;
      self.emit("input", self.serial, index, value);

    } else if(type === "Sensor"){

      self.data.sensors[index] = value;
      self.emit("sensor", self.serial, index, value);

    } else if(type === "Output"){

      self.data.outputs[index] = value;
      self.emit("output", self.serial, index, value);

    }

  } else if (type === 'Status latest value "Detached" (removing)') {

    self._handleConnectionEnd(self);

  }

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









phidgets.Phidget = Phidget;
module.exports = phidgets;