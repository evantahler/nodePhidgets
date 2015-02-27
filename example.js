var phidgets = require('./lib/phidgets.js');
var options = {
  host: "phidgetsbc.local"
};
var phidget = new phidgets.Phidget(options);

// events
phidget.on('state',  function(state){ console.log("[state] " + state); });
phidget.on('error',  function(error){ console.log("[error] " + error); });
phidget.on('input',  function(boardId, id, value){ console.log("[" + boardId + "][input]  " + id + " @ " + value); });
phidget.on('sensor', function(boardId, id, value){ console.log("[" + boardId + "][sensor] " + id + " @ " + value); });
phidget.on('output', function(boardId, id, value){ console.log("[" + boardId + "][output] " + id + " @ " + value); });

// debugging event
// phidget.on('line', function(line){ console.log("[line] " + line); });

// connect
phidget.connect(function(){

  console.log("connected to:");
  console.log(phidget.ids);

  setInterval(function(){ phidget.setOutput(null, 0, true); }, 1000);
  setInterval(function(){ phidget.setOutput(null, 0, false);}, 1500);

});