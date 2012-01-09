var phidgets = require('./phidgets.js').phidgets;
var params = {
	host: "phidgetsbc.local."
};
phidgets.connect(params, function(){
	console.log("connected!");
});