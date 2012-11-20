var phidget = require('../phidgetAPI').phidget;

var motor=new phidget();

motor.on(
    "log", 
    function(data){
        console.log('log ',data);
    }
);

motor.on(
    "error", 
    function(data){
        console.log('error ',data);
    }
);

/*
 * Detecting status change for both Re-Attach and Detach
 */
motor.on(
    'changed', 
    function(data){
        console.log('phidget status changed');
        console.log('data ',data);
        
    }
);
    
/*
 * Detecting Phidget Detach
 */
motor.on(
    'changed', 
    function(data){
        console.log('changed data ',data);
        
    }
);

motor.on(
    'phidgetReady',
    function(){
        console.log('motor ready');
        console.log(motor.data);
        motor.set(
            {
                type:'Engaged',
                key:'0',
                value:'1'
            }
        );
        motor.set(
            {
                type:'Position',
                key:'0',
                value:'6.300000E+02'
            }
        );
        setTimeout(
            function(){
                motor.set(
                    {
                        type:'Position',
                        key:'0',
                        value:'2.310000E+03'
                    }
                )
            },
            1000
        );
    }
);


/*
 * Phidget API will default to a motor if no type is specified,
 * for clarity's sake, you may set the type to PhidgetManager
 * 
 * motor.connect(
 *      {
 *          type:PhidgetManager
 *      }
 * );
 * 
 */

motor.connect(
    {
        type: 'PhidgetServo'
    }
);

/*
 * an example of how to see the data being transferred to and from the phidget
 * 
 * motor.connect(
 *      {
 *          rawLog:true
 *      }
 * );
 * 
 */