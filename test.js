////////////////////////////////////////////////////////////////////////////
// IMPORT
var phidgets = require('./phidgets.js').phidgets;

////////////////////////////////////////////////////////////////////////////
// SETUP EVENT LISTNERS (optional)
var ready = false;
phidgets.on("data", function(type, id, value){
	if (ready){
		console.log(" phidgets data >> "+type+" #"+id+" now at @ "+value);
	}
});
phidgets.on("log", function(data){
	console.log(" phidgets log >> "+data);
});

////////////////////////////////////////////////////////////////////////////
// PARAMS TO CONNECT TO YOUR PHIDGET BOARD (defaults will be used if none provided)
var params = {
	host: "phidgetsbc.local",
};

////////////////////////////////////////////////////////////////////////////
// CONNECT AND GAIN ACCESS TO PHIDGET DATA OBJECT
phidgets.connect(params, function(phidgetData){
	ready = true;
	console.log("All Connected!  Here's the array of data about inputs/outputs:");
	console.log(phidgetData);
	setTimeout(a, 1000);
});

////////////////////////////////////////////////////////////////////////////
// CHANGE SOME OF THE OUTPUTS
function a(){
	phidgets.setOutput(4,true); // turn digital output #4 on
	setTimeout(b, 1000);
}

function b(p){
	phidgets.setOutput(4,false); // turn digital output #4 off
	setTimeout(c, 1000);
}

////////////////////////////////////////////////////////////////////////////
// DISCONNECT
function c(){
	phidgets.quit();
	console.log("ALL DONE!");
}