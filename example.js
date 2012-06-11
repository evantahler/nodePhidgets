var phidget = require('./phidgetAPI').phidget;

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

        phidget.on(
            'changed', 
            update
        );
    }
);

var update=function(data){
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

/*
* Connect to Phidget 
*/
phidget.connect(
    {
        type:'PhidgetInterfaceKit'
    }
);