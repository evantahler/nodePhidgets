# nodejs Phidgets API
_A nodeJS API for interacting with any type of Phidget_

[![Endorse Me](http://api.coderwall.com/riaevangelist/endorsecount.png)](http://coderwall.com/riaevangelist)

## ABOUT PHIDGETS AND NODE
[Phidget boards](http://http://www.phidgets.com/) are a great prototyping tool which can handle digital inputs and outputs, along with a great array of analog sensors (RFID, temperature, etc).  [nodeJS](http://nodejs.org) is a fantastic networking library which makes it easy to create fast networked applications.  Currently there is no API supported by Phidgets for nodeJS, this project aims to become the default library for Phidget - nodeJS integration.

## Phidget Server Requirement
This project assumes you have the Phidget server up and running.  For most "regular" (USB) Phidget boards, that assumes that the computer you have connected to the Phidget board via USB has the webservice up and running.  For stand-alone Phidget micro-computers (phidgetsbc), this assumes you have configured the server via the web portal.  You will be connecting to the Phidget server via TCP, so be sure you can access the server from the machine running this project.

## Installation
#NPM
* npm install phidgetapi

#GIT

* git clone git://github.com/RIAEvangelist/nodePhidgetsAPI.git

## Running node.js on a phidget board
Phidget makes a line of phidget boards which themselves are small ARM Debian comptuers.  It is possble to run nodeJS on them, and use this package locally.  Here's a [gist](https://gist.github.com/1574158) with the steps and a [Blog Post](http://blog.evantahler.com/node-js-running-on-a-phidgets-sbc2-board) about how to get the package which inspired this project up and running. It should be nearly the same for this although I have yet to test this on a Phidgets SBC.

## Interaction

The PhidgetsAPI package exposes a few different ways of interacting with your Phidgets :

### Events

Once connected, the phidgets object will throw a few types of  events: 
    phidgetReady : the Phidget has been initialized and the basic data map has been created. No arguments passed.
    error        : there was an error ( go figure ). error data will be passed through from the board, or the API.
    disconnected : the Phidget is no longer being listened to.
    changed      : some data value has been changed/update/modified on or via a Phidget
    added        : a new data key value pair has been added to the Phidget's data scope. Or if using the PhidgetManager type, a new phidget has been attached to the webservice for the first time during the current programs session.
    attached     : PhidgetManager type only, a phidget device has been attached
    detached     : PhidgetManager type only, a phidget device has been detached
__it is possible that as new Phidgets are created there may be more events, however, the event dispatching method should be future proofed, and thus may emit events not described here.__

### Methods

__phidget.connect(params)__  This is the main initialize function.  Params is a JSON array of connection variables.  The phidgetReady event will be dispatched upon connection and initialization success. You may wish to bind other listeners to your __phidget__ inside a listener for this event.

__phidgets.set(params)__  This method is used to set any output or setable device ( onboard led etc ) on your Phidget. See your __phidget__.data object for possible outputs. The paramaters required for this method are as follows and remember JS is case sensative so math that case exactly as it is in the __phidget__.data object:
    type : the key for the object your output resides ( maybe 'board', 'Output', 'Trigger' etc. check the phidget.data to see what options are available for the specific phidget you are working with )
    key  : the key of the output you wish to set
    value: the value you wish to set

__phidgets.quit()__ This method requests a disconnect from the phidget board.  The disconnected event will be dispatched when the connection has been successfully disconnected. 

## Connecting & Configuration Params
`phidgets.connect` can be passed an a JSON object of options.  Here are the options and their defaults:

	{
		host    : 'localhost',
		port    : 5001,
		version : '1.0.10', //older phidgetwebservice installs may require 1.0.9
		password: null,
		type    : 'PhidgetManager',
		rawLog  : false
	}

__Note on `version`__: version in this case is the version of the phidget server and associated API.  You should check your phidget server to learn the version in use.  The good news is that the APIs we are using here have not changed for the past 3 years, and appear to be unlikely to do so in the future.  If you run into errors with newer versions, let me know.


## Example For Phidget Interface Kit 8/8/8

	var phidget = require('phidgetAPI').phidget;

        phidget.on(
            "error", 
            function(data){
                console.log('error ',data);
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
            console.log('phidget state changed');
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
                type    : 'PhidgetInterfaceKit'
            }
        );

The above example will show you the available Sensors, Inputs and Outputs as well as the Triggers ( amount of change required in sensor value for a change event to be fired ) for the Phidgets Interface Kit 8/8/8. It will also cause an LED connected the Output 0 and G to flash red for 200 milliseconds upon a change in any sensor data.

## ToDo:
* Support for Phidget authentication
* create more examples for various Phidgets
