# nodePhidgetsAPI
_A node.js library for interacting with any type of Phidget_

## ABOUT PHIDGETS AND NODE
[Phidget boards](http://http://www.phidgets.com/) are a great prototyping tool which can handle digital inputs and outputs, along with a great array of analog sensors (RFID, temperature, etc).  [nodeJS](http://nodejs.org) is a fantastic networking library which makes it easy to create fast networked applications.  Currently there is no API supported by Phidgets for nodeJS, this project aims to become the default library for Phidget - nodeJS integration.

## Phidget Server Requirement
This project assumes you have the Phidget server up and running.  For most "regular" (USB) Phidget boards, that assumes that the computer you have connected to the Phidget board via USB has the server up and running.  For stand-alone Phidget micro-computers (phidgetsbc), this assumes you have configured the server via the web portal.  You will be connecting to the Phidget server via TCP, so be sure you can access the server from the machine running this project.

## Installation
* npm will be created when stable

OR

* git clone git://github.com/RIAEvangelist/nodePhidgetsAPI.git

## Running node.js on a phidget board
Phidget makes a line of phidget boards which themselves are small ARM Debian comptuers.  It it possble to run nodeJS on them, and use this package locally.  Here's a [gist](https://gist.github.com/1574158) with the steps and a [Blog Post](http://blog.evantahler.com/node-js-running-on-a-phidgets-sbc2-board) about how to get the package which inspired this project up and running. It should be nearly the same for this although I have yet to test this on a Phidgets SBC.

## Interaction

The PhidgetsAPI package exposes a few different ways of interacting with your Phidgets :

### Events

Once connected, the phidgets object will throw a few types of  events: 
    phidgetReady : the Phidget has been initialized and the basic data map has been created. No arguments passed.
    error        : there was an error ( go figure ). error data will be passed through from the board, or the API.
    disconnected : the Phidget is no longer being listened to.
    changed      : some data value has been changed/update/modified on or via a Phidget
    added        : a new data key value pair has been added to the Phidget's data scope.
__it is possible that as new Phidgets are created there may be more events, however, the event dispatching method should be future proofed, and thus may emit events not described here.__

### Methods

__phidget.connect(params)__  This is the main initialize function.  Params is a JSON array of connection variables.  The phidgetReady event will be dispatched upon connection and initialization success. You may wish to bind other listeners to your __phidget__ inside a listener for this event.

__phidgets.set(params)__  This method is used to set any output or setable device ( onboard led etc ) on your Phidget. See your __phidget__.data object for possible outputs. The paramaters required for this method are as follows and remember JS is case sensative so math that case exactly as it is in the __phidget__.data object:
    type : the key for the object your output resides ( maybe 'board' or 'Output' etc. )
    key  : the key of the output you wish to set
    value: the value you wish to set

__phidgets.quit()__ This method requests a disconnect from the phidget board.  The disconnected event will be dispatched when the connection has been successfully disconnected. 

## Connecting & Configuration Params
`phidgets.connect` can be passed an a JSON object of options.  Here are the options and their defaults:

	{
		host    : 'localhost',
		port    : 5001,
		version : '1.0.9',
		password: null,
                type    : 'PhidgetInterfaceKit'
	}

__Note on `version`__: version in this case is the version of the phidget server and associated API.  You should check your phidget server to learn the version in use.  The good news is that the APIs we are using here have not changed for the past 3 years, and appear to be unlikely to do so in the future.  If you run into errors with newer versions, let me know.


## Example

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

This example should produce very verbose output like this. you can easily control your own level of logging this way :

        data  { '7': '16', type: 'DataRate', key: '7', value: '16' }
        added
        data  { '6': '16', type: 'DataRate', key: '6', value: '16' }
        added
        data  { '5': '16', type: 'DataRate', key: '5', value: '16' }
        added
        data  { '4': '16', type: 'DataRate', key: '4', value: '16' }
        added
        data  { '3': '16', type: 'DataRate', key: '3', value: '16' }
        added
        data  { '2': '16', type: 'DataRate', key: '2', value: '16' }
        added
        data  { '1': '16', type: 'DataRate', key: '1', value: '16' }
        added
        data  { '0': '16', type: 'DataRate', key: '0', value: '16' }
        added
        data  { type: 'board',
            key: 'DataRateMax',
            value: '16',
            DataRateMax: '16' }
        added
        data  { type: 'board',
            key: 'DataRateMin',
            value: '1000',
            DataRateMin: '1000' }
        added
        data  { type: 'board', key: 'InitKeys', value: '61', InitKeys: '61' }
        added
        data  { type: 'board',
            key: 'InterruptRate',
            value: '8',
            InterruptRate: '8' }
        added
        data  { type: 'board', key: 'ID', value: '69', ID: '69' }
        added
        data  { type: 'board',
            key: 'NumberOfOutputs',
            value: '8',
            NumberOfOutputs: '8' }
        added
        data  { type: 'board',
            key: 'NumberOfInputs',
            value: '8',
            NumberOfInputs: '8' }
        added
        data  { '7': '0', type: 'Output', key: '7', value: '0' }
        added
        data  { '6': '0', type: 'Output', key: '6', value: '0' }
        added
        data  { '5': '0', type: 'Output', key: '5', value: '0' }
        added
        data  { '4': '0', type: 'Output', key: '4', value: '0' }
        added
        data  { '3': '0', type: 'Output', key: '3', value: '0' }
        added
        data  { '2': '0', type: 'Output', key: '2', value: '0' }
        added
        data  { '1': '0', type: 'Output', key: '1', value: '0' }
        added
        data  { '0': '1', type: 'Output', key: '0', value: '1' }
        added
        data  { '7': '0', type: 'RawSensor', key: '7', value: '0' }
        added
        data  { '6': '0', type: 'RawSensor', key: '6', value: '0' }
        added
        data  { '5': '0', type: 'RawSensor', key: '5', value: '0' }
        added
        data  { '4': '72', type: 'RawSensor', key: '4', value: '72' }
        added
        data  { '3': '4', type: 'RawSensor', key: '3', value: '4' }
        added
        data  { '2': '0', type: 'RawSensor', key: '2', value: '0' }
        added
        data  { '1': '0', type: 'RawSensor', key: '1', value: '0' }
        added
        data  { '0': '4087', type: 'RawSensor', key: '0', value: '4087' }
        added
        data  { type: 'board',
            key: 'Ratiometric',
            value: '1',
            Ratiometric: '1' }
        added
        data  { type: 'board',
            key: 'NumberOfSensors',
            value: '8',
            NumberOfSensors: '8' }
        added
        data  { '7': '10', type: 'Trigger', key: '7', value: '10' }
        added
        data  { '6': '10', type: 'Trigger', key: '6', value: '10' }
        added
        data  { '5': '10', type: 'Trigger', key: '5', value: '10' }
        added
        data  { '4': '10', type: 'Trigger', key: '4', value: '10' }
        added
        data  { '3': '10', type: 'Trigger', key: '3', value: '10' }
        added
        data  { '2': '10', type: 'Trigger', key: '2', value: '10' }
        added
        data  { '1': '10', type: 'Trigger', key: '1', value: '10' }
        added
        data  { '0': '10', type: 'Trigger', key: '0', value: '10' }
        added
        data  { type: 'board',
            key: 'Status',
            value: 'Attached',
            Status: 'Attached' }
        added
        data  { type: 'board',
        key: 'Name',
        value: 'Phidget InterfaceKit 8/8/8',
        Name: 'Phidget InterfaceKit 8/8/8' }
        added
        data  { type: 'board', key: 'Version', value: '900', Version: '900' }
        added
        data  { type: 'board', key: 'Label', value: '', Label: '' }
        
        phidget ready
        
        { boardID: '115576',
        DataRate:
        { '0': '16',
            '1': '16',
            '2': '16',
            '3': '16',
            '4': '16',
            '5': '16',
            '6': '16',
            '7': '16' },
        board:
        { DataRateMax: '16',
            DataRateMin: '1000',
            InitKeys: '61',
            InterruptRate: '8',
            ID: '69',
            NumberOfOutputs: '8',
            NumberOfInputs: '8',
            Ratiometric: '1',
            NumberOfSensors: '8',
            Status: 'Attached',
            Name: 'Phidget InterfaceKit 8/8/8',
            Version: '900',
            Label: '' },
        Output:
        { '0': '1',
            '1': '0',
            '2': '0',
            '3': '0',
            '4': '0',
            '5': '0',
            '6': '0',
            '7': '0' },
        RawSensor:
        { '0': '4087',
            '1': '0',
            '2': '0',
            '3': '4',
            '4': '72',
            '5': '0',
            '6': '0',
            '7': '0' },
        Trigger:
        { '0': '10',
            '1': '10',
            '2': '10',
            '3': '10',
            '4': '10',
            '5': '10',
            '6': '10',
            '7': '10' } }

        changed
        data  { '7': '0', type: 'RawSensor', key: '7', value: '0' }
        changed
        data  { '6': '0', type: 'RawSensor', key: '6', value: '0' }
        changed
        data  { '5': '0', type: 'RawSensor', key: '5', value: '0' }
        changed
        data  { '4': '72', type: 'RawSensor', key: '4', value: '72' }
        changed
        data  { '3': '4', type: 'RawSensor', key: '3', value: '4' }
        changed
        data  { '2': '0', type: 'RawSensor', key: '2', value: '0' }
        changed
        data  { '1': '0', type: 'RawSensor', key: '1', value: '0' }
        added
        data  { '7': '0', type: 'Sensor', key: '7', value: '0' }
        added
        data  { '6': '0', type: 'Sensor', key: '6', value: '0' }
        added
        data  { '5': '0', type: 'Sensor', key: '5', value: '0' }
        added
        data  { '4': '18', type: 'Sensor', key: '4', value: '18' }
        added
        data  { '3': '1', type: 'Sensor', key: '3', value: '1' }
        added
        data  { '2': '0', type: 'Sensor', key: '2', value: '0' }
        added
        data  { '1': '0', type: 'Sensor', key: '1', value: '0' }
        added
        data  { '0': '998', type: 'Sensor', key: '0', value: '998' }
        changed
        data  { '0': '4087', type: 'RawSensor', key: '0', value: '4087' }
        changed
        data  { '7': '0', type: 'Output', key: '7', value: '0' }
        changed
        data  { '6': '0', type: 'Output', key: '6', value: '0' }
        changed
        data  { '5': '0', type: 'Output', key: '5', value: '0' }
        changed
        data  { '4': '0', type: 'Output', key: '4', value: '0' }
        changed
        data  { '3': '0', type: 'Output', key: '3', value: '0' }
        changed
        data  { '2': '0', type: 'Output', key: '2', value: '0' }
        changed
        data  { '1': '0', type: 'Output', key: '1', value: '0' }
        changed
        data  { '0': '1', type: 'Output', key: '0', value: '1' }
        added
        data  { '7': '0', type: 'Input', key: '7', value: '0' }
        added
        data  { '6': '0', type: 'Input', key: '6', value: '0' }
        added
        data  { '5': '0', type: 'Input', key: '5', value: '0' }
        added
        data  { '4': '0', type: 'Input', key: '4', value: '0' }
        added
        data  { '3': '0', type: 'Input', key: '3', value: '0' }
        added
        data  { '2': '0', type: 'Input', key: '2', value: '0' }
        added
        data  { '1': '0', type: 'Input', key: '1', value: '0' }
        added
        data  { '0': '0', type: 'Input', key: '0', value: '0' }


## ToDo:
* Support for Phidget authentication
* create more examples for various Phidgets
