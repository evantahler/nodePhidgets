var phidget = require('../phidgetAPI').phidget;

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
    'changed', 
    function(data){
        console.log('changed');
        console.log('data ',data);
        
        switch(data.key){
            case 'TagState' :
                if(data.value=='1'){
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
);
    
RFID.on(
    'added', 
    function(data){
        console.log('added');
        console.log('data ',data);
    }
);

RFID.on(
    'phidgetReady',
    function(){
        console.log('phidget ready');
        console.log(RFID.data);
        
        RFID.set(
            {
                type:'board',
                key:'LEDOn',
                value:'1'
            }
        );
    }
);


/*
 * Connect to phidget 
 */
RFID.connect(
    {
        type:'PhidgetRFID'
    }
);
    
/*
 * an example of how to see the data being transferred to and from the phidget
 * 
 * RFID.connect(
 *      {
 *          rawLog:true
 *      }
 * );
 * 
 */