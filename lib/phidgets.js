/**
 * Phidgets library
 * @todo add support for connecting to a board by label.
 * @todo add support for authentication
 * @todo complete close function
 * @todo understand what lid0 does ?!
 *
 *
 * done: chainable, timeout if no connection, module
 */

'use strict';

// Dependencies
var net = require('net');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

// Module container
var phidgets = { version: "0.5.0" };

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
  this._reconnectionDelay = 200;

  this._readyWaitTimeout = 200;
  this._readyCheckCount = 0;
  this._maxReadyCheckCount = 5;

  //this._reconnectCount = 0;
  //this._maxReconnectionAttempts = 5;

  return this;

};

util.inherits(Phidget, EventEmitter);

Phidget.prototype.connect = function(options) {

  var self = this;

  self._connectCount++;

  options = options || {};
  this.host = options.host || this.host;
  this.port = options.port || this.port;
  this.serial = options.serial || this.serial;
  //this.label = options.label || this.label;
  //this.password = options.password || this.password;

  self.emit('connecting');

  self._client = net.createConnection(self.port, self.host, function() {

    self._client.setEncoding('utf8');
    self._client.setKeepAlive("enable", 10000);

    self._client.on('end',   function() {
      self._handleConnectionEnd(self);
    });
    self._client.on('close', function() {
      self._handleConnectionEnd(self);
    });
    self._client.on('error', function(e){
      self.emit('error', e);
    });
    self._client.on('data',  function(d){
      self._handleData(d, self);
    });

    self.connectWaitTimer = setTimeout(self._checkReady, self._readyWaitTimeout, self);
    self._client.write("995 authenticate, version=" + self._protocol + self._delimiter);
    self._client.write("report 8 report" + self._delimiter);

    // Open message
    var message  = "set /PCK/Client/0.0.0.0/" + self._randomId.toString();
    message     += "/" + self.type;

    // If a label has been specified, use it. If not, use the serial.
    //if (self.label !== undefined) {
    //  message   += "/-1/" + _escapeLabel(self.label);
    //} else if (self.serial !== -1) {
    if (self.serial !== undefined) {
      message   += "/" + self.serial;
    }

    message += "=\"Open\" for session" + self._delimiter;
    self._client.write(message);

    // Listen message
    //self._client.write("listen /PSK/PhidgetInterfaceKit lid0" + self._delimiter);
    self._client.write("listen /PSK/" + self.type + " lid0" + self._delimiter);

  });

  return self;

};

Phidget.prototype.quit = function(){
  var self = this;
  self.reconnect = false;
  self._client.write("quit\r\n");
  return self;
};

Phidget.prototype.setOutput = function(output, value){
  var self = this;

  if(self.ready !== true){
    throw new Error('board is not ready');
  }

  if(value === true){ value = 1; }
  if(value === false){ value = 0; }
  output = parseInt(output);
  value = parseInt(value);

  if(value === 1 || value === 0){
    var msg = 'set /PCK/PhidgetInterfaceKit/' + this.serial + '/Output/' + output + '="' + value + '"' + this._delimiter;
    self._client.write(msg);
    self.data.outputs[output] = value;
  }else{
    throw new Error('digital input must be true/false or 1/0');
  }

  return self;

};

Phidget.prototype._checkReady = function(self){

  if(self === undefined) { self = this; }

  clearTimeout(self.connectWaitTimer);

  if(self.ready === false) {

    // We will wait some more but eventually will throw an error
    if (self._readyCheckCount >= self._maxReadyCheckCount) {
      self.emit('failed');
    } else {
      self._readyCheckCount++;
      self.connectWaitTimer = setTimeout(self._checkReady, self._readyWaitTimeout, self);
    }

  } else {
    self.emit('connected');
    self._readyCheckCount = 0;
  }

};

Phidget.prototype._handleConnectionEnd = function(self) {

  self._client.removeAllListeners(['end', 'close', 'error', 'data']);
  clearTimeout(self.connectWaitTimer);
  self._client.destroy();

  self.ready = false;
  self.emit('disconnected');

  if(self.reconnect === true){
    setTimeout(function() {self.connect();}, self._reconnectionDelay);
  }
};

Phidget.prototype._handleData = function(chunk, self){
  var index, line;

  chunk = chunk.toString('utf8');
  self._socketDataString += chunk;

  while((index = self._socketDataString.indexOf('\n')) > -1){
    line = self._socketDataString.slice(0, index);
    self._socketDataString = self._socketDataString.slice(index + 1);
    line = line.replace(/\u0000/gi, "");
    line = line.replace(/\u0001/gi, "");

    self.emit('line', line);

    var words = line.split(" ");
    if(words[0] === "report" && words[4] === 'key'){
      // report 200-lid0 is pending, key /PSK/PhidgetInterfaceKit//48587/Output/6 latest value "0" (changed)
      var pathParts = words[5].split('/');
      var serial   = parseInt(pathParts[4]);
      var type      = pathParts[5];
      var number    = parseInt(pathParts[6]);
      var value     = parseInt(words[8].replace('"',""));

      //if(self.ids.indexOf(boardId) < 0){
      //  self.ids.push(boardId);
      //  self.data[boardId] = {
      //    inputs:  {},
      //    sensors: {},
      //    outputs: {}
      //  };
      //}
      if (self.serial === undefined) {
        self.serial = serial;
      }

      if(type === "Input"){
        self.data.inputs[number] = value;
        self.emit("input", serial, number, value);
      } else if(type === "Sensor"){
        self.data.sensors[number] = value;
        self.emit("sensor", serial, number, value);
      } else if(type === "Output"){
        self.data.outputs[number] = value;
        self.emit("output", serial, number, value);
      }

    }else if(words[0] === '994'){
      self.emit('error', line);
    }

    if(self.ready === false && line === "report 200-that's all for now"){
      self.ready = true;
    }
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