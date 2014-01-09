var phidgetsPrototype = require('./lib/phidgets.js');
var options = {
  host: "phidgetsbc.local"
}
var phidgets = new phidgetsPrototype(options);

// events
phidgets.on('state',  function(state){  console.log("[state] " + state);   });
phidgets.on('error',  function(error){  console.log("[error] " + error);   });
phidgets.on('input',  function(id, value){  console.log("[input] " + id + " @ " + value);   });
phidgets.on('sensor', function(id, value){ console.log("[sensor] " + id + " @ " + value); });
phidgets.on('output', function(id, value){ console.log("[output] " + id + " @ " + value); });

// debugging event
// phidgets.on('line', function(line){ console.log("[line] " + line); });

// connect
phidgets.connect(function(){

  console.log("Board ID: " + phidgets.id);

  setInterval(function(){ phidgets.setOutput(0, true); }, 1000);
  setInterval(function(){ phidgets.setOutput(0, false);}, 1500);

});