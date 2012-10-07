var phidget = require('../phidgetAPI').phidget;

var IK=new phidget();

IK.on(
    "log", 
    function(data){
        console.log('log ',data);
    }
);

IK.on(
    "error", 
    function(data){
        console.log('error ',data);
    }
);

IK.on(
    'changed', 
    function(data){
        console.log('changed');
        console.log('data ',data);
        
        if(data.type=='Sensor'){
            IK.set(
                {
                    type:'Output',
                    key:'0',
                    value:'1'
                }
            );
            setTimeout(
                function(){
                    IK.set(
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

IK.on(
    'phidgetReady',
    function(){
        console.log('InterfaceKit (IK) ready');
        console.log(IK.data);
        
        IK.set(
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
IK.connect(
    {
        type:'PhidgetInterfaceKit'
    }
);
    
/*
 * an example of how to see the data being transferred to and from the phidget
 * 
 * IK.connect(
 *      {
 *          rawLog:true
 *      }
 * );
 * 
 */