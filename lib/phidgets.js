'use strict';

var net = require('net');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

var Phidget = function(options) {

  this.options = this.defaults();
  this.data = {};
  this.ready = false;
  this.socketDataString = '';
  this.client = null;
  this.shouldReconnect = true;
  this.ids = [];

  for(var i in options){
    if(this.options[i] !== undefined && options.hasOwnProperty(i)) {
      this.options[i] = options[i];
    }
  }

};

util.inherits(Phidget, EventEmitter);

Phidget.prototype.defaults = function(){
  return {
    host:             "127.0.0.1",
    port:             5001,
    version:          "1.0.10",
    password:         null,
    delimiter:        '\r\n',
    readyWaitTimeout: 200,
    reconnectionDelay: 200
  };
};

Phidget.prototype.connect = function(next){
  var self = this;

  self.emit('state', 'connecting');

  self.client = net.createConnection(self.options.port, self.options.host, function(){
    self.client.setEncoding('utf8');
    self.client.setKeepAlive("enable", 10000);

    self.client.on('end',   function() {
      self.handleConnectionEnd(self, next);
    });
    self.client.on('close', function() {
      self.handleConnectionEnd(self, next);
    });
    self.client.on('error', function(e){
      self.emit('error', e);
    });
    self.client.on('data',  function(d){
      self.handleData(d, self);
    });

    self.connectWaitTimer = setTimeout(self.checkReady, self.options.readyWaitTimeout, next, self);

    self.client.write("995 authenticate, version=" + self.options.version + self.options.delimiter);
    self.client.write("report 8 report" + self.options.delimiter);
    self.client.write("set /PCK/Client/0.0.0.0/1/PhidgetInterfaceKit=\"Open\" for session" + self.options.delimiter);
    self.client.write("listen /PSK/PhidgetInterfaceKit lid0" + self.options.delimiter);
  });
};

Phidget.prototype.checkReady = function(next, self){
  if(self === undefined) { self = this; }

  clearTimeout(self.connectWaitTimer);
  if(self.ready === false){
    self.connectWaitTimer = setTimeout(self.checkReady, self.options.readyWaitTimeout, next, self);
  }else{
    self.emit('state', 'connected');
    if(typeof next === 'function'){
      next();
    }
  }
};

Phidget.prototype.quit = function(){
  var self = this;

  self.shouldReconnect = false;
  self.client.write("quit\r\n");
};

Phidget.prototype.handleConnectionEnd = function(self, next){

  self.client.removeAllListeners(['end', 'close', 'error', 'data']);
  clearTimeout(self.connectWaitTimer);
  self.client.destroy();

  self.ready = false;
  self.emit('state', 'disconnected');
  if(self.shouldReconnect === true){
    setTimeout(function() {self.connect(next);}, self.options.reconnectionDelay);
  }
};

Phidget.prototype.setOutput = function(boardId, output, value){
  var self = this;

  if(self.ready !== true){
    throw new Error('board is not ready');
  }

  if(boardId === undefined && self.ids.length === 1) {
    boardId = self.ids[0];
  } else if(boardId === undefined) {
    throw new Error('boardId is required');
  }

  if(value === true){ value = 1; }
  if(value === false){ value = 0; }
  output = parseInt(output);
  value = parseInt(value);

  if(value === 1 || value === 0){
    var msg = 'set /PCK/PhidgetInterfaceKit/' + boardId + '/Output/' + output + '="' + value + '"' + this.options.delimiter;
    self.client.write(msg);
    self.data[boardId].outputs[output] = value;
  }else{
    throw new Error('digital input must be true/false or 1/0');
  }
};

Phidget.prototype.handleData = function(chunk, self){
  var index, line;

  chunk = chunk.toString('utf8');
  self.socketDataString += chunk;

  while((index = self.socketDataString.indexOf('\n')) > -1){
    line = self.socketDataString.slice(0, index);
    self.socketDataString = self.socketDataString.slice(index + 1);
    line = line.replace(/\u0000/gi, "");
    line = line.replace(/\u0001/gi, "");

    self.emit('line', line);

    var words = line.split(" ");
    if(words[0] === "report" && words[4] === 'key'){
      // report 200-lid0 is pending, key /PSK/PhidgetInterfaceKit//48587/Output/6 latest value "0" (changed)
      var pathParts = words[5].split('/');
      var boardId   = parseInt(pathParts[4]);
      var type      = pathParts[5];
      var number    = parseInt(pathParts[6]);
      var value     = parseInt(words[8].replace('"',""));

      if(self.ids.indexOf(boardId) < 0){
        self.ids.push(boardId);
        self.data[boardId] = {
          inputs:  {},
          sensors: {},
          outputs: {}
        };
      }

      if(type === "Input"){
        self.data[boardId].inputs[number] = value;
        self.emit("input", boardId, number, value);
      } else if(type === "Sensor"){
        self.data[boardId].sensors[number] = value;
        self.emit("sensor", boardId, number, value);
      } else if(type === "Output"){
        self.data[boardId].outputs[number] = value;
        self.emit("output", boardId, number, value);
      }

    }else if(words[0] === '994'){
      self.emit('error', line);
    }

    if(self.ready === false && line === "report 200-that's all for now"){
      self.ready = true;
    }
  }

};

var phidgets = {};
phidgets.Phidget = Phidget;
module.exports = phidgets;