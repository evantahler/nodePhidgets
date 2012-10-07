var phidget = require('../phidgetAPI').phidget;

var manager=new phidget();

manager.on(
    "log", 
    function(data){
        console.log('log ',data);
    }
);

manager.on(
    "error", 
    function(data){
        console.log('error ',data);
    }
);

/*
 * Detecting Phidget Attached for first time
 * Phidgets attached at the start of your program will
 * not fire added, they will simply be available in the manager.data
 * 
 */
manager.on(
    'added', 
    function(data){
        console.log('new phidget detected');
        console.log('data ',data);
        
    }
);

/*
 * Detecting status change for both Re-Attach and Detach
 */
manager.on(
    'changed', 
    function(data){
        console.log('phidget status changed');
        console.log('data ',data);
        
    }
);
    
/*
 * Detecting Phidget Attach
 */
manager.on(
    'attached', 
    function(data){
        console.log('phidget re-attached');
        console.log('data ',data);
        
    }
);
    
/*
 * Detecting Phidget Detach
 */
manager.on(
    'changed', 
    function(data){
        console.log('phidget detached');
        console.log('data ',data);
        
    }
);

manager.on(
    'phidgetReady',
    function(){
        console.log('manager ready');
        console.log(manager.data);
        
    }
);


/*
 * Phidget API will default to a manager if no type is specified,
 * for clarity's sake, you may set the type to PhidgetManager
 * 
 * manager.connect(
 *      {
 *          type:PhidgetManager
 *      }
 * );
 * 
 */

manager.connect();

/*
 * an example of how to see the data being transferred to and from the phidget
 * 
 * manager.connect(
 *      {
 *          rawLog:true
 *      }
 * );
 * 
 */