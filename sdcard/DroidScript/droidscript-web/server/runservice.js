/* 
 * Copyright 2017 droidscript.org
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

//module.exports.x=
//module.exports.

// *********************************************************************************

var fsp =require('path');
var ipc =require('node-ipc');
var cp  =require('child_process');

const optionDefinitions = [
//  { name: 'verbose', alias: 'v', type: Boolean },
//  { name: 'src', type: String, multiple: true, defaultOption: true },
//  { name: 'timeout', alias: 't', type: Number }
    { name: 'start', type: String },
    { name: 'stop',  type: String }
]

const commandLineArgs = require('command-line-args')
const opts = commandLineArgs(optionDefinitions)
const svrbase=fsp.join("sdcard","DroidScript","droidscript-web","server");

ipc.config.retry= 1500;
ipc.config.silent=true;
ipc.config.maxRetries=0;

function doConnect() {
    if(!this.connected) {
        this.tries++;
        ipc.connectTo('service', "/tmp/SERVICE-"+this.id+".sock",
            function() {
                ipc.of.service.on('connect', function() {
                    this.connected=true;
                    if(this.send) {
                        console.log("SEND: "+this.send);
                        ipc.of.service.emit(this.send,null); // E.g. "stop"
                    }
                    else { ipc.of.service.emit('inituser',JSON.stringify({user:'test'})); }
                }.bind(this));
                ipc.of.service.on('disconnect',function() {}.bind(this));
                ipc.of.service.on('message', function(data) {
                    console.log('got a message from '+this.id+' Service : ', data);
                }.bind(this));
            }.bind(this)
        );
        checkConnect.call(this);
    }
}

function checkConnect() {
    setTimeout(function() {
        //console.log('Connected: '+this.connected);
        if(!this.connected) {
            if(!this.connecting) {
                this.connecting=true;
                var path=fsp.join(svrbase,'droidscript_svc.js');
                var sProc = cp.fork(path, ['--id', this.id], {detached:true});
                //setTimeout(doConnect.bind(this), 0);
            }
            setTimeout(doConnect.bind(this), 200);
        }
    }.bind(this),10);
}

if(opts.start) {
    ipc.config.id   = opts.start;
    doConnect.call({id:ipc.config.id, connected:false, tries:0});
}

if(opts.stop) {
    ipc.config.id   = opts.stop;
    doConnect.call({id:ipc.config.id, connected:false, tries:0, send:'stop'});
}

//if(!opts.stop) {
//    setTimeout(() => {
//        console.log("\n\nSending another message...");
//        ipc.of.service.emit('message','Another Message');
//    }, 5000);
//}
