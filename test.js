var phidgets = require('./phidgets.js').phidgets;
var params = {
	host: "phidgetsbc.local.",
	rawLog: true
};
phidgets.connect(params, function(){
	console.log("connected!");
});