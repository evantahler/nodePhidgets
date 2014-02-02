var phidgetsPrototype = require('./lib/phidgets.js');
var options = {
  host: "phidgetsbc.local"
}
var phidgets = new phidgetsPrototype(options);

// events
phidgets.on('state',  function(state){ console.log("[state] " + state); });
phidgets.on('error',  function(error){ console.log("[error] " + error); });
phidgets.on('input',  function(boardId, id, value){ console.log("[" + boardId + "][input]  " + id + " @ " + value); });
phidgets.on('sensor', function(boardId, id, value){ console.log("[" + boardId + "][sensor] " + id + " @ " + value); });
phidgets.on('output', function(boardId, id, value){ console.log("[" + boardId + "][output] " + id + " @ " + value); });

// debugging event
// phidgets.on('line', function(line){ console.log("[line] " + line); });

// connect
phidgets.connect(function(){

  console.log("connected to:");
  console.log(phidgets.ids);

  setInterval(function(){ phidgets.setOutput(null, 0, true); }, 1000);
  setInterval(function(){ phidgets.setOutput(null, 0, false);}, 1500);

});