var phidget = require('../phidgetAPI');

var RFID=new phidget();

RFID.on(
    "log", 
    function(data){
        console.log('log ',data);
    }
);

RFID.on(
    "error", 
    function(data){
        console.log('error ',data);
    }
);

RFID.on(
    'phidgetReady',
    function(){
        RFID.set(
            {
                type:'board',
                key:'AntennaOn',
                value:'1'
            }
        );
        RFID.on(
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
                RFID.set(
                    {
                        type:'Output',
                        key:'0',
                        value:'1'
                    }
                );
                
                RFID.set(
                    {
                        type:'board',
                        key:'LEDOn',
                        value:'1'
                    }
                );
                break;
            }

            RFID.set(
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
RFID.connect(
    {
        type:'PhidgetRFID'
    }
);