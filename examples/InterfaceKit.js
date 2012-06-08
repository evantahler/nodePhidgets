var phidget = require('../phidgetAPI').phidget;

phidget.on(
    "log", 
    function(data){
        console.log('log ',data);
    }
);

phidget.on(
    "error", 
    function(data){
        console.log('error ',data);
    }
);

phidget.on(
    'changed', 
    function(data){
        console.log('changed');
        console.log('data ',data);
        
        if(data.type=='Sensor'){
            phidget.set(
                {
                    type:'Output',
                    key:'0',
                    value:'1'
                }
            );
            setTimeout(
                function(){
                    phidget.set(
                        {
                            type:'Output',
                            key:'0',
                            value:'0'
                        }
                    );
                },
                200
            );
        }
        
    }
);
    
phidget.on(
    'added', 
    function(data){
        console.log('added');
        console.log('data ',data);
    }
);

phidget.on(
    'phidgetReady',
    function(){
        console.log('phidget ready');
        console.log(phidget.data);
        
        phidget.set(
                {
                    type:'Output',
                    key:'0',
                    value:'1'
                }
            );
    }
);


/*
 * Connect to phidget 
 */
phidget.connect(
    {
        type:'PhidgetInterfaceKit'
    }
);