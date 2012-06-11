var phidget = require('../phidgetAPI').phidget;

console.log(phidget);

var RFID=new phidget();

var IK888=new phidget();

RFID.on(
    'phidgetReady',
    function(){
        console.log('RFID ready');
        console.log(RFID.data);
        
    }
);
    
IK888.on(
    'phidgetReady',
    function(){
        console.log('InterfaceKit ready');
        console.log(IK888.data);
        
    }
);

/*
 * Connect to RFID phidget 
 */
RFID.connect(
    {
        type:'PhidgetRFID'
    }
);

/*
 * Connect to InterfaceKit 8/8/8 phidget 
 */
IK888.connect(
    {
        type:'PhidgetInterfaceKit'
    }
);