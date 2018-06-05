const WSServ=require('websocket').server;
const sqlite=require('sqlite3');
const TxDb  =require('sqlite3-transactions').TransactionDatabase;
const ipc   =require('node-ipc');
const fsp   =require('path');
const URL   =require('url');
const fs    =require('fs');
const os    =require('os');
const vm    =require('vm');

const base=fsp.join("sdcard","DroidScript");

const optionDefinitions = [
//  { name: 'verbose', alias: 'v', type: Boolean },
//  { name: 'src', type: String, multiple: true, defaultOption: true },
//  { name: 'timeout', alias: 't', type: Number }
    { name: 'id', type: String },
    { name: 'debug', alias: 'd', type: Boolean }
]

const commandLineArgs = require('command-line-args')
const opts = commandLineArgs(optionDefinitions)

var id=opts.id;
if(!id) { console.error("Missing --id ServiceName"); process.exit(); }

const sysRoot=process.cwd();
const appRoot=fsp.join(base,id);

process.title='droidscript_svc '+id;

//////////////////////////////////////////////////////////////////////////////////////////////////////
// SERVICE APP IMPLEMENTATION                                                                       //
//////////////////////////////////////////////////////////////////////////////////////////////////////

global.app={__users:[]};

function __resolve(path) {
    // Relative paths prepend absolute appRoot.  Absolute paths prepend sysRoot instead.
    return fsp.join(fsp.isAbsolute(path) ? sysRoot : '', fsp.resolve(appRoot, path));
}

function __debug(msg) {
    if(opts.debug) console.log(msg);
}

function initApp(app, firstUser) {
    if(firstUser) { app.__users.push(firstUser); }
    
    app.__inspect = function(obj) {
        return require('util').inspect(obj);
    }
    
    app.LoadScript = function(path, callback) {
        __debug("app.LoadScript "+path);
        path=__resolve(path);
        var scr=fs.readFileSync(path, {encoding:"utf-8"});    
        vm.runInThisContext(scr, {filename:path});
        if(callback) { callback(); }
    };

    app.SysExec = function(cmd, options) {
        __debug("app.SysExec "+cmd);
        return require("child_process").execSync(cmd).toString();
    };

    app.MakeFolder = function(targetDir) {
        // Implementation based on version by Mouneer on https://stackoverflow.com/questions/31645738/how-to-create-full-path-with-nodes-fs-mkdirsync
        __debug(`app.Makefolder ${targetDir}`);
        const isAbs=fsp.isAbsolute(targetDir);
        const initDir = isAbs ? fsp.sep : '';
        targetDir.split(fsp.sep).reduce((parentDir, childDir) => {
            const curDir = fsp.resolve(appRoot, parentDir, childDir);
            const finalDir = fsp.join(isAbs ? sysRoot : '', curDir);
            try { fs.mkdirSync(finalDir); }
            catch (err) {
                if (err.code !== 'EEXIST') { throw err; }
            }
            return curDir;
        }, initDir);
    }

    app.OpenDatabase = function(path) {
        __debug("app.OpenDatabase "+path);
        fullPath=__resolve(path);
        let db=new TxDb(new sqlite.Database(fullPath, sqlite.OPEN_READWRITE | sqlite.OPEN_CREATE));
        db.GetName = () => { __debug("Db.GetName -> "+path); return path; };
        db.transaction = (callback, onError, onSuccess) => {
            db.beginTransaction(function(err, transaction) {
                if(err) { console.error(err); return; }
                transaction.executeSql = (sql, parms, onComplete, onFail) => {
                    //console.log("Tx.run "+sql+"; parms="+parms);
                    if(!parms) { parms=[]; }
                    var txCall=transaction.run;                    
                    if(sql.toLowerCase().substr(0,7) == "select ") { txCall=transaction.all; }
                    txCall.call(transaction, sql, parms, (err, rows) => { // Individual statement
                            if(err) { onFail(transaction, new Error(err+": in sql:\n"+sql)); }
                            else {
                                var results=null;
                                if(txCall == transaction.all) {
                                    var rowsObj={
                                        rows:rows,
                                        length:rows.length,
                                        item: function(n) { return rows[n]; }
                                    };
                                    results={rows:rowsObj};
                                }
                                else {
                                    console.log("Changes: "+this.changes);
                                    results={rowsAffected:this.changes, insertId:this.lastId, rows:{length:0}};
                                }
                                onComplete(transaction, results);
                            }
                        });
                };
                callback(transaction);
                transaction.commit( (err) => {
                    if(err) { onError(err); }
                    else { onSuccess(); }
                });
            });
        };
        //db2.all(`select * from customers`, [], (err, rows) => { rows.forEach((row) => { console.log(row.id+"\t"+JSON.stringify(row)); }); });
        return db;
    };

    app.ReadFile = function(path, encoding) {
        __debug("app.ReadFile "+path);
        return fs.readFileSync(__resolve(path), {encoding:encoding}).toString();
    };

    app.ShowPopup = function(msg, options) {
        console.log("NOT IMPLEMENTED: app.ShowPopup "+msg);
    };

    app.PreventWifiSleep = function() {
        //__debug("NOT IMPLEMENTED: app.PreventWifiSleep");
    };

    app.CreateWebServer = function(port) {
        const server = require('http').createServer((request, response) => {
            __debug("OnServRequest: "+request.url);
            var url=URL.parse(request.url);
            for(let xa=0; xa<server.__paths.length; xa++) {
                if(server.__paths[xa].path === url.pathname) {
                    __debug("path: "+server.__paths[xa].path+"; url.pathname="+url.pathname);
                    var req=url.query.split('&').reduce((map, val) => { let v=val.split('='); map[v[0]]=decodeURIComponent(v[1]); return map; }, {});
                    var info={remoteAddress:request.connection.remoteAddress};
                    server.__requests.push({request:request, response:response});
                    server.__paths[xa].callback(req, info);
                }
            }
        });
        server.__paths=[];
        server.__requests=[];
        server.SetFolder = (folder) => { __debug("WS.SetFolder "+folder); server.__folder=folder; };
        server.SetOnReceive = function(callback) {
            var wss = new WSServ({httpServer: server, autoAcceptConnections: true});
            wss.on('request', function(request) {
                __debug("OnWSockReq");
            });
        };
        server.SendText = function(msg) {
            console.log("NOT IMPLEMENTED: server.SendText "+msg);
        };
        server.AddServlet = function(path, callback) {
            __debug("Server.AddServlet "+path);
            server.__paths.push({path:path, callback:callback});
        };
        server.SetResponse = function(html) {
            let reqres=server.__requests.shift();
            if(!reqres) { console.log("server.SetResponse: No request!"); return; } // No request to respond to
            var res=reqres.response;
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.write(html);
            res.end();
        };
        server.Start = function() {
            server.listen(port, () => {
                __debug(`DroidScript server is listening on ${port}`);
            });
        };
        return server;
    };

    app.SendMessage = function(msg) {
        console.log("app.SendMessage (to "+app.__users.length+" users): "+msg);
        for(let xa=0; xa<app.__users.length; xa++) {
            ipc.server.emit(app.__users[xa].socket, 'message', msg);
        }
    };
}
//////////////////////////////////////////////////////////////////////////////////////////////////////
if(opts.debug) {
    console.log("Debugging...");
    startService(id);
}

//////////////////////////////////////////////////////////////////////////////////////////////////////
// ERROR HANDLING                                                                                   //
//////////////////////////////////////////////////////////////////////////////////////////////////////
process.stdin.resume();//so the program will not close instantly

function exitHandler(options, err) {
    //console.log("EXITING "+id);
    if (options.cleanup) {
        //console.log('clean');
        fs.unlink("/tmp/SERVICE-"+id+".sock");
    }
    if (err) console.log(err.stack);
    if (options.exit) process.exit();
}

process.on('exit', exitHandler.bind(null,{cleanup:true})); // app is closing
process.on('SIGINT', exitHandler.bind(null, {exit:true})); //catches ctrl+c event
process.on('SIGTERM', exitHandler.bind(null, {exit:true})); //catches soft kill event
process.on('SIGUSR1', exitHandler.bind(null, {exit:true})); // catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR2', exitHandler.bind(null, {exit:true}));
process.on('uncaughtException', exitHandler.bind(null, {exit:true})); // catches uncaught exceptions
//////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////
function startService(id, firstUser) {
    //var app={__user:info.user, __socket:info.socket}; //console:console, require:require, process:process, fs:fs, vm:vm, os:os, fsp:fsp, appRoot:appRoot};
    initApp(app, firstUser);
    var sandbox={app:app, console:console, window:global, global:global, setTimeout:setTimeout, setInterval:setInterval};
    var context = new vm.createContext(sandbox);
    
    runScript(context, fsp.join(appRoot,"Service.js"));
    vm.runInContext("OnStart();", context, {filename:"droidscript_svc.js"});
}

function runScript(context, path) {
    console.log("runScript "+path);
    var scr=fs.readFileSync(path, {encoding:"utf-8"});
    vm.runInContext(scr, context, {filename:path});
}


/* Example from running service on Android:
proc={"pid":"32409","command":"com.smartphoneremote.androidscriptfree:droidscript_service","arguments":""}
Desired output:
{"user":10230,"pid":32409,"name":"com.smartphoneremote.androidscriptfree:droidscript_service"} running
{"user":10031,"pid":4123,"name":"com.google.android.googlequicksearchbox:interactor"} running
{"user":10174,"pid":22127,"name":"adarshurs.android.vlcmobileremote"} running
{"user":1000,"pid":881,"name":"system"} running
*/
//////////////////////////////////////////////////////////////////////////////////////////////////////

ipc.config.id   = 'service';
ipc.config.retry= 1500;
ipc.config.silent=true;

console.log("RUNNING SERVICE:",process.pid);

ipc.serve(
    "/tmp/SERVICE-"+id+".sock",
    function(){
        ipc.server.on('start', function(data,socket) {
            console.log("Starting id="+id);
        });
        ipc.server.on('inituser', function(data,socket) {
            console.log("inituser: "+data);
            data=JSON.parse(data);
            var user={user:data.user, socket:socket};
            if(app.__users.length > 0) { app.__users.push(user); }
            else { startService(id, user); }
        });
        ipc.server.on('message', function(data,socket) {
            ipc.log('got a message : '.debug, data);
            ipc.server.emit(socket, 'message', data+' world');
        });
        ipc.server.on('stop', function(data, socket) { 
            console.log("Stopping "+id);
            process.exit(); 
        });
        ipc.server.on('socket.disconnected', function(socket, destroyedSocketID) {
            ipc.log('client ' + destroyedSocketID + ' has disconnected!');
        });
    }
);

ipc.server.start();

