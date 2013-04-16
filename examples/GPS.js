var phidget = require('../phidgetAPI').phidget;

var GPS=new phidget();

GPS.on(
    "log", 
    function(data){
        console.log('log ',data);
    }
);

GPS.on(
    "error", 
    function(data){
        console.log('error ',data);
    }
);

GPS.on(
    'changed', 
    function(data){
        console.log('changed');
        console.log('data ',data);
    }
);

GPS.on(
    'phidgetReady',
    function(){
        console.log('GPS ready');
        console.log(GPS.data);
        
    }
);


/*
 * Connect to phidget 
 */
GPS.connect(
    {
        type:'PhidgetGPS'
    }
);
    
/*
 * an example of how to see the data being transferred to and from the phidget
 * 
 * GPS.connect(
 *      {
 *          rawLog:true
 *      }
 * );
 * 
 */
