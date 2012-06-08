/* 
 * Phidget Interface for nodeJS
 * Brandon Miller
 * 
 * June 2012
 * 
 * inspired by Evan Tahler's 
 * https://github.com/evantahler/nodephidget
 * commit # 59d4424dea4fb4eeaea10591b6817c07a09d8726
 */

var net = require('net');
var EventEmitter = require('events').EventEmitter;

var phidget = new EventEmitter;
phidget.data = {};
phidget.socketDataString = '';

phidget.defaults = {
    host: 'localhost',
    port: 5001,
    version: '1.0.9',
    password: null,
    rawLog: false,
    type:'PhidgetInterfaceKit'
};

phidget.ready = false;
phidget.connect = false;
phidget.update = false;
phidget.set = false;
phidget.quit = false;
phidget.disconnected = false;

phidget.connect = function(params, callback){
    
    if(!params)
        params={};

    for(key in phidget.defaults){
        if(!params[key])
            params[key]=phidget.defaults[key];
    }

    phidget.params = params;
    params=false;

    phidget.client = net.createConnection(
        phidget.params.port, 
        phidget.params.host, 
        function(){
            phidget.client.setEncoding('utf8');
            //phidget.client.setKeepAlive('enable', 10000);

            phidget.client.on(
                'data', 
                phidget.update
            );

            phidget.client.on(
                'end', 
                phidget.disconnected
            );

            phidget.client.on(
                'close', 
                phidget.disconnected
            );

            phidget.client.write(
                '995 authenticate, version='+
                phidget.params.version+
                '\r\n'
            );
                
            phidget.client.write('report 8 report\r\n');
                
            phidget.client.write(
                'set /PCK/Client/0.0.0.0/1/'+
                phidget.params.type+
                '="Open" for session\r\n'
            );
            
            phidget.client.write(
                'listen /PSK/'+
                phidget.params.type+
                ' lid0\r\n'
            );

        }
    );	

    phidget.client.on(
        'error', 
        function(data){
            phidget.emit(
                'error',
                data
            );
        }
    );
};

phidget.update = function(buffer){
    var lines,
        chunk,
        data={};
        
    phidget.socketDataString += buffer.toString('utf8');
    
    
    //console.log(phidget.socketDataString)
    
   
    if(phidget.socketDataString.indexOf('\n')<0)
        return;
    
    lines = phidget.socketDataString;
    phidget.socketDataString='';
    
    lines = lines.replace(/[\u0000\u0001]/gi, '');
    lines = lines.split('\n');
    
    for( index in lines ){
        chunk=lines[index].split('key ')[1];
        if(!chunk){
            if(!phidget.ready && lines[index] == 'report 200-that\'s all for now'){
                phidget.ready = true;
                phidget.emit('phidgetReady');
            }
            continue;
        }
        chunk=chunk.split(' latest value ');
        chunk[0]=chunk[0].split('/');
        chunk[1]=chunk[1].split('"');
        chunk[2]=chunk[1][1];
        chunk[3]=chunk[1][2].replace(/[\s()]/ig,'');
        chunk[4]=chunk[0][4];
        chunk[1]=chunk[0].pop();
        chunk[0]=chunk[0].pop();
        
        /*
        console.log(lines[index])
        console.log(chunk)
        console.log('\n')
        */
        
        if(!phidget.data.boardID)
            phidget.data.boardID=chunk[4];
        
        if(phidget.data.boardID==chunk[0])
            chunk[0]='board';
        
        if(!phidget.data[chunk[0]])
            phidget.data[chunk[0]]={};
        
        phidget.data[chunk[0]][chunk[1]]=chunk[2];
        
        var e={
            type:chunk[0],
            key:chunk[1],
            value:chunk[2]
        }
        e[chunk[1]]=chunk[2];
        
        phidget.emit(
            chunk[3],
            e
        );        
    }
};

phidget.set = function(params){
        var packet='';
        if(
                !params.type ||
                !params.key ||
                !params.value
        ){
            phidget.emit(
                'error',
                'missing one or more required params when attepting to set. required object keysets : type, key, value'
            )
            return;
        }
        
        switch(params.type){
            case 'board' :
                packet = 'set /PCK/'+
                    phidget.params.type+
                    '/'+
                    phidget.data.boardID+
                    '/'+
                    params.key+
                    '="'+
                    params.value+
                    '"\r\n';
                break;
            default :
                packet = 'set /PCK/'+
                    phidget.params.type+
                    '/'+
                    phidget.data.boardID+
                    '/'+
                    params.type+
                    '/'+
                    params.key+
                    '="'+
                    params.value+
                    '"\r\n';
                break;
        }
        
        console.log(packet);
        phidget.data[params.type][params.key]=params.value;
        phidget.client.write(packet);
};

phidget.quit = function(){
    phidget.ready = false;
    phidget.client.write('quit\r\n');
    phidget.emit('disconnected');
};

phidget.disconnected = function(){
    phidget.ready=false;
    phidgit.emit(
        'disconnected'
    );
    delete phidget.client;
};

exports.phidget = phidget;
