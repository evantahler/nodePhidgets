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
    'phidgetReady',
    function(){
        phidget.set(
            {
                type:'board',
                key:'AntennaOn',
                value:'1'
            }
        );
        phidget.on(
            'changed',
            phidgetUpdate
        );
    }
);
 
var phidgetUpdate=function(data){
    console.log(data)
    switch(data.key){
        case 'TagState' :
            if(data.value=='1'){
                phidget.set(
                    {
                        type:'Output',
                        key:'0',
                        value:'1'
                    }
                );
                
                phidget.set(
                    {
                        type:'board',
                        key:'LEDOn',
                        value:'1'
                    }
                );
                break;
            }

            phidget.set(
                {
                    type:'board',
                    key:'LEDOn',
                    value:'0'
                }
            );
            break;
    }
}

/*
 * Connect to phidget 
 */
phidget.connect(
    {
        type:'PhidgetRFID'
    }
);