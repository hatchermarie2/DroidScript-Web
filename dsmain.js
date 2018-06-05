#!/usr/bin/env node
/* dsmain: DroidScript-web server manager
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

const fs         = require('fs');
const cluster    = require('cluster');
const colorsafe  = require('colors/safe');
const consoleTEN = require('console-ten');
const watchr     = require('watchr');
const fsp        = require('path');
const DSERVER    = fsp.join("sdcard","DroidScript","droidscript-web","server");
const SCONFIG    = fsp.join(DSERVER,'config.json');
const fVersion   = fsp.join(DSERVER,'version.js');
const fDirlist   = fsp.join(DSERVER,'dirlist.js');
const version    = require('.'+fsp.sep+fVersion);
const PRODUCT    = version.PRODUCT;
const VERSION    = version.VERSION;
const dlst       = require('.'+fsp.sep+fDirlist);
const dirlist    = dlst.dirlist;
const normalizePath = dlst.normalizePath;
const apps=fsp.sep+fsp.join('sdcard','DroidScript')+fsp.sep;
const rootPath=normalizePath("");
const _ds=fsp.join(apps,'droidscript-web');

var options={
    port:8082,
    sport:8444,
    username:{admin:'admin'},
    password:{admin:'changeme'}, // FIXME: Usernames/passwords should be stored in a separate database, or better yet, rely on Google/OAuth
    realm:{admin:'WiFi Administration'},
    debug:true,
    sdcard:"/sdcard",
    appsDir:null,
    apksDir:null,
    autoboots: []
};

function loadConfig(inMaster) {
    try {
	const fs = require('fs'); // statSync, readdirSync, readFileSync, readdir, stat, readFile, writeFile, access, createWriteStream
	options=JSON.parse(fs.readFileSync(SCONFIG));
	initLogging();
	const fsp = require('path'); // path join
	if(!options.appsDir) options.appsDir=fsp.join(options.sdcard, "DroidScript");
	if(!options.apksDir) options.apksDir=fsp.join(options.appsDir,"APKs");	
	if(options) { console.debug((inMaster ? "MCFG: " : "CFG: ")+colorsafe.green(JSON.stringify(options))); }
    }
    catch(err) {
	if(err.code !== 'ENOENT') {
	    console.error("loadConfig "+err);
	    throw err;
	}
    }
}

function initLogging() {
    // If not calling this, provide default: console.debug = function(){};
    var dbg=consoleTEN.LEVELS.WARNING;
    if(options.debug) switch(options.debug) {
        case 'error':   dbg=consoleTEN.LEVELS.ERROR;   break;
        case 'warning': dbg=consoleTEN.LEVELS.WARNING; break;
        case 'log':     dbg=consoleTEN.LEVELS.LOG;     break;
        case 'info':    dbg=consoleTEN.LEVELS.INFO;    break;
        case 'debug':   dbg=consoleTEN.LEVELS.DEBUG;   break;
        default: dbg=consoleTEN.LEVELS.ALL; break;
    }
    consoleTEN.init(console, dbg, function(levelName) {
        function dateToYMD(date) {
            try {
            var d = date.getDate();
            var m = date.getMonth() + 1;
            var y = date.getFullYear();
            }
            catch(e) { console.error("dateToYMD: "+e.stack); }
            return              '' + y  + '-' + 
            (m  <= 9 ? '0' +  m : m)  + '-' +
            (d  <= 9 ? '0' +  d : d);
        }
        function dateToHMS(date) {
            try {
            var hh = date.getHours();
            var mm = date.getMinutes();
            var ss = date.getSeconds();
            }
            catch(e) { console.error("dateToHMS: "+e.stack); }
            return formatHMS(hh,mm,ss);
        }
        function formatHMS(hh,mm,ss) {
            return (hh <= 9 ? '0' + hh : hh) + ':' +
            (mm <= 9 ? '0' + mm : mm) + ':' +
            (ss <= 9 ? '0' + ss : ss);
        }
        function dateToYMDHMS(date) {
            return dateToYMD(date) + ' ' + dateToHMS(date);
        }
        
        var color="grey";
        switch(levelName) { // white,black unused
            case 'ERROR':   color="red";     break; // console.error
            case 'WARNING': color="yellow";  break;	// console.warn
            case 'LOG':     color="green";   break;	// console.log
            case 'INFO':    color="blue";    break;	// console.info
            case 'DEBUG':   color="magenta"; break;	// console.debug
            case 'ALL': 
            default: color="cyan";
        }
        var stk=new Error().stack;
        var src=stk.split('\n')[3].split('/');
        src=src[src.length-1].replace(/.js/,'').replace(/\)/,'');
        if(src == "warning:18:20") {
            //console.log("WARNING: "+stk);
            //throw stk;
            /*
            * 
            * 
    Error
        at /home/warren/src/DroidScript-Web/dsmain.js:120:10
        at Console.consoleObj.(anonymous function) [as error] (/home/warren/node_modules/console-ten/index.js:39:32)
        at writeOut (internal/process/warning.js:18:20)
        at output (internal/process/warning.js:69:3)
        at process.on (internal/process/warning.js:100:7)
        at emitOne (events.js:116:13)
        at process.emit (events.js:211:7)
        at internal/process/warning.js:74:13
        at _combinedTickCallback (internal/process/next_tick.js:131:7)
        at process._tickDomainCallback (internal/process/next_tick.js:218:9)
            
            * 
            * */
        }
        stk=('['+src+']                ').substr(0,20);
        var d = dateToYMDHMS(new Date());

        return colorsafe.inverse(colorsafe[color](d))+ " " + stk + " ";
    });
}

function initWatch(path) {
    function listener (changeType, fullPath, currentStat, previousStat) {
        switch ( changeType ) {
            case 'update':
            case 'create':
            case 'delete':
                console.log('the file', fullPath, 'was changed ('+changeType+')');
                if(fullPath == "dsmain.js" || fullPath == fVersion || fullPath == fDirlist) {
                    console.warn("Master server changed."); process.exit();
                }
                if(apps.substr(1) === fullPath.substr(0, apps.length-1)) {
                    var app=fullPath.substr(apps.length-1).split(fsp.sep)[0];
                    if(app === 'droidscript-web') { updateAppCaches(); }
                    else { updateAppCache(app); }
                }
                if(fullPath.startsWith(DSERVER)) {
                    if(fullPath === SCONFIG) { loadConfig(true); }
                    console.warn("Stopping changed nodes...");
                    Object.keys(cluster.workers).forEach((id) => {
                        var worker=cluster.workers[id];
                        worker.send('shutdown');
                        worker.disconnect();
                        worker.timeout = setTimeout(() => { console.warn("Killing",id); worker.kill('SIGKILL'); }, 2000);		
                    });
                }
        }
    }
    function next (err) {
        if ( err )  return console.error('Watch failed on', path, 'with error', err)
        console.info('Watch successful on', path)
    }    
    
    // Create the stalker for the path
    var stalker = watchr.create(path);
    
    // Listen to the events for the stalker/watcher 
    // http://rawgit.com/bevry/watchr/master/docs/index.html#watcher 
    stalker.on('change', listener);
    //stalker.on('log', console.info);
    stalker.once('close', function (reason) {
        console.log('closed', path, 'because', reason);
        stalker.removeAllListeners();  // as it is closed, no need for our change or log listeners any more 
    });
    
    // Set the default configuration for the stalker/watcher 
    // http://rawgit.com/bevry/watchr/master/docs/index.html#Watcher%23setConfig 
    stalker.setConfig({
        stat: null,
        interval: 5007,
        persistent: true,
        catchupDelay: 2000,
        preferredMethods: ['watch', 'watchFile'],
        followLinks: true,
        ignorePaths: false,
        ignoreHiddenFiles: true,
        ignoreCommonPatterns: true,
        ignoreCustomPatterns: null
    });
    
    // Start watching 
    stalker.watch(next);
    
    // Stop watching 
    //stalker.close()
}

function updateAppCaches() { // Create .appcache file for each app
    console.info("Updating App Caches...");
    fs.readdir(rootPath+apps, (err, list) => {
        if(err) { throw err; }
        //dirlist.call({root:rootPath, q:['/'],skip:[apps+'droidscript-web'],only:[apps+'sample3']}, '1.txt');
        list.forEach( (v) => {
            if(v === 'droidscript-web') { return; }
            updateAppCache(v);
        });
    });
}

function updateAppCache(app) {
    console.info("Creating cache for "+app);
    var sub=fsp.join(apps,app);
    dirlist.call({root:rootPath, only:[sub,_ds]}, fsp.join(rootPath, sub, '.appcache'));
}

function initMaster() {
    // Keep track of http requests
    var numReqs = 0;
//     setInterval(() => {
// 	console.log('numReqs =', numReqs);
//     }, 1000);

    // Count requests
    function messageHandler(msg) {
        if (msg.cmd && msg.cmd == 'notifyRequest') { numReqs++; }
    }

    function onDisconnect() { // Bind to worker
        if(this.timeout) { clearTimeout(this.timeout); this.timeout=null; }
    }

    function initWorker(worker) {
        //console.log(`master started ${worker.process.pid}`);
        worker.on('message', messageHandler);
        worker.on('disconnect', onDisconnect.bind(worker));
    }

    console.info(PRODUCT,"v"+VERSION,"Watching for changes...");
    //initWatch('.'); //process.cwd());
    loadConfig(true);
    
    updateAppCaches();
    
    // Start workers and listen for messages containing notifyRequest
    const numCPUs = require('os').cpus().length;
    console.log('Starting',numCPUs,'worker'+(numCPUs==1?'':'s')+'.');
    var workers=[];
    for (let i = 0; i < numCPUs; i++) {
        var f=cluster.fork();
        workers[f.process.pid]=true;
        initWorker(f);
    }
    cluster.on('exit', (worker, code, signal) => {
        if(workers[worker.process.pid]) { // else not one of our workers
            console.warn('Worker %d died (%s). restarting...', worker.process.pid, signal || code);
            setTimeout(function() { initWorker(cluster.fork()); },1000);
        }
    });
}

// ********************** Initialize Cluster **************************
if (cluster.isMaster) { initMaster(); }
else {
    loadConfig(false);
    require('.'+fsp.sep+fsp.join(DSERVER,'dserve.js')).httpserv(options);
}
