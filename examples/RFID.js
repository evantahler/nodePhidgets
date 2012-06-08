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
        
        switch(data.key){
            case 'TagState' :
                if(data.value=='1'){
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
    }
);


/*
 * Connect to phidget 
 */
phidget.connect(
    {
        type:'PhidgetRFID'
    }
);