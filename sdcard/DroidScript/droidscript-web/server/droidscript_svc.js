const Database =require('better-sqlite3');
const WSServ=require('websocket').server;

//const sqlite=require('sqlite3');
//const TxDb  =require('sqlite3-transactions').TransactionDatabase;

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

global.app={__users:[], __context:null};

function __resolve(path) {
    // Relative paths prepend absolute appRoot.  Absolute paths prepend sysRoot instead.
    return fsp.join(fsp.isAbsolute(path) ? sysRoot : '', fsp.resolve(appRoot, path));
}

function __debug(msg) {
    if(opts.debug) console.log("SRVR:"+msg);
}

app.__inspect = function(obj) {
    return require('util').inspect(obj);
}

app.LoadScript = function(path, callback) {
    __debug("app.LoadScript "+path);
    path=__resolve(path);
    var scr=fs.readFileSync(path, {encoding:"utf-8"});    
    //scr='console.log("#1:type="+(typeof testdata));'+scr;
    //vm.runInThisContext(scr, {filename:path});
    
    //app.__context.this=app.__context.window;
    app.__context.window=app.__context;
    app.__context.window.require=require;
    
    vm.runInContext(scr, app.__context, {filename:path});
    //console.log("LOADSCRIPT#1: te="+require('util').inspect(app.__context.window, false, 0, false));
    // THERE but no TemplateEngine: console.log("LOADSCRIPT#2: window="+require('util').inspect(app.__context.window));
    //console.log("LOADSCRIPT#3: this="+require('util').inspect(app.__context.this, false, 0, false));
    // UNDEFINED: console.log("LOADSCRIPT#4: this.te="+require('util').inspect(app.__context.this.TemplateEngine));
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
    // Return array of SQL statements to execute, safely split on semicolons
    function sqlMulti(sql) {
        var sq=0,dq=0,res=[],s='';
        sql=sql.split('\n').filter((line) => line.indexOf('--') == -1).join('\n'); // Filter out comment lines
        for(var xa=0; xa<sql.length; xa++) {
            var ch=sql[xa];
            switch(ch) {
                case "'": if(!dq) sq=1-sq; break;
                case '"': if(!sq) dq=1-dq; break;
                case ';': if(!sq && !dq) { ch=''; s=s.trim(); if(s) res.push(s); s=''; } break;
                case '\n': if(!sq && !dq) { ch=' '; } break;
                case '\r': if(!sq && !dq) { ch=' '; } break;
            }
            s+=ch;
        }
        s=s.trim(); if(s) res.push(s);
        return res;
    }
    
    __debug("app.OpenDatabase "+path);
    fullPath=__resolve(path);
//        let db=new TxDb(new sqlite.Database(fullPath, sqlite.OPEN_READWRITE | sqlite.OPEN_CREATE));
    let db={};
    db._db=new Database(fullPath);
    db._begin=db._db.prepare('BEGIN');
    db._commit=db._db.prepare('COMMIT');
    db._rollback=db._db.prepare('ROLLBACK');
    
    db.GetName = () => { __debug("Db.GetName -> "+path); return path; };
    db.transaction = (callback, onError, onSuccess) => {
        const tx={
            executeSql: (sql, parms, onComplete, onFail) => {
                //console.log("SRVR:executeSql: "+sql+'; len='+sqlMulti(sql).length);
                sqlMulti(sql).forEach((sql) => {
                    //console.log("executeSql: "+sql+"*****");
                    const stmt=db._db.prepare(sql);
                    var results=null;
                    // Fix parameters
                    if(parms) for(let xa=0; xa<parms.length; xa++) {
                        parms[xa]=(parms[xa].constructor.name == 'Date') ? parms[xa].valueOf() : parms[xa];
                    }
                    try {
                        if(sql.toLowerCase().substr(0,7) !== "select ") { 
                            var inf=parms?stmt.run(parms):stmt.run();
                            console.log("SRVR:Changes: "+inf.changes);
                            results={rowsAffected:inf.changes, insertId:inf.lastInsertROWID, rows:{length:0}};
                        }
                        else {
                            var rows=parms?stmt.all(parms):stmt.all();
                            var rowsObj={
                                rows:rows,
                                length:rows.length,
                                item: function(n) { return rows[n]; }
                            };
                            results={rows:rowsObj};
                        }
                        if(typeof onComplete === 'function')  onComplete(stmt, results);
                        else { throw new Error("ERROR: no onComplete to receive Results: "+JSON.stringify(results)); }
                    }
                    catch(e) {
                        //throw e;
                        if(typeof onFail === 'function') onFail(stmt, e); 
                        else throw e;
                    }
                });
            }
        };
        db._begin.run();
        try {
            callback(tx);
            db._commit.run();
            if(typeof onSuccess === 'function') onSuccess();
        }
        catch(e) {
            if(db._db.inTransaction) { db._rollback.run(); }
            if(typeof onError === 'function') onError(e);
        }
    };
    db._Err = function(t, e) { console.log("DB ERROR: "+t+";e="+e); }
    db.ExecuteSql = function( sql, params, success, error )
    {
        if( !success ) success = null;
        if( !error ) error = _Err;
        
        db.transaction( function(tx) {
                tx.executeSql( sql, params,
                    function(tx,res) { if(success) success.apply(db,[res]) },
                    function(t,e) { error.apply(db,[e.message]); }
                );
            }, error
        );
    };        
    return db;
};

app.ReadFile = function(path, encoding) {
    __debug("app.ReadFile "+path);
    return fs.readFileSync(__resolve(path), {encoding:encoding}).toString();
};

app.ShowPopup = function(msg, options) {
    //console.log("SRVR:"+NOT IMPLEMENTED: app.ShowPopup "+msg);
    __debug("SERVICE app.ShowPopup (to "+app.__users.length+" users): "+msg);
    var m={"_DroidScript_Fn":"ShowPopup", "data":msg, "options":options};
    if(typeof ipc.server.emit == 'function') for(let xa=0; xa<app.__users.length; xa++) {
        ipc.server.emit(app.__users[xa].socket, 'message', m);
    }
    
};

app.PreventWifiSleep = function() {
    //__debug("NOT IMPLEMENTED: app.PreventWifiSleep");
};

app.CreateWebServer = function(port) {
    function urldecode(text) {
        return decodeURIComponent((text + '').replace(/\+/g, '%20'));
    }
    const server = require('http').createServer((request, response) => {
        __debug("OnServRequest: "+request.url);
        var url=URL.parse(request.url);
        for(let xa=0; xa<server.__paths.length; xa++) {
            if(server.__paths[xa].path === url.pathname) {
                __debug("path: "+server.__paths[xa].path+"; url.pathname="+url.pathname);
                if(!url.query) { url.query=""; }
                var req=url.query.split('&').reduce((map, val) => { let v=val.split('='); map[v[0]]=urldecode(v[1]); return map; }, {});
                var info={remoteAddress:request.connection.remoteAddress};
                server.__requests.push({request:request, response:response});
                server.__paths[xa].callback(req, info);
            }
        }
    });
    server.__paths=[];
    server.__requests=[];
    server.__conns=[];
    server.SetFolder = (folder) => { __debug("WS.SetFolder "+folder); server.__folder=folder; };
    server.SetOnReceive = function(callback) {
        var wss = new WSServ({httpServer: server});
        wss.on('request', function(request) {
            var conn = request.accept(null, request.origin);
            console.log('SRVR:WS SERVICE '+conn.remoteAddress+' (origin '+request.origin+') '+request.httpRequest.url);
            server.__conns[conn.remoteAddress]=conn;
            conn.on('message', function(msg) {
                if(msg.type !== 'utf8') { throw new Error("Invalid message type: "+msg.type); }
                callback(msg.utf8Data, this.remoteAddress);
            }.bind(conn));
            conn.on('close', function(reasonCode, description) {
                console.log('SRVR:DIS '+conn.remoteAddress+" "+reasonCode+" "+description);
                var c=[];
                for(ip in server.__conns) {
                    if(ip != conn.remoteAddress) c.push(server.__conns[ip]);
                }
                server.__conns=c;
            });
            
        });
    };
    server.SendText = function(msg, ip) {
        //console.log("SRVR:NOT IMPLEMENTED: server.SendText "+msg);
        //server.__conns.push({ip:conn.remoteAddress, conn:conn});
        if(ip) { server.__conns[ip].send(msg); return; }
        for(xip in server.__conns) { server.__conns[xip].send(msg); }
    };
    server.AddServlet = function(path, callback) {
        __debug("Server.AddServlet "+path);
        server.__paths.push({path:path, callback:callback});
    };
    server.SetResponse = function(html) {
        let reqres=server.__requests.shift();
        if(!reqres) { console.log("SRVR:server.SetResponse: No request!"); return; } // No request to respond to
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
    console.log("SRVR:app.SendMessage (to "+app.__users.length+" users): "+msg);
    var m={"_DroidScript_Fn":"SendMessage", "data":msg};
    if(typeof ipc.server.emit == 'function') for(let xa=0; xa<app.__users.length; xa++) {
        try { ipc.server.emit(app.__users[xa].socket, 'message', m); }
        catch(e) { console.error("ERROR",e); }
    }
};

function initApp(app, firstUser) {
    if(firstUser) { app.__users.push(firstUser); }
}    

//////////////////////////////////////////////////////////////////////////////////////////////////////
// ERROR HANDLING                                                                                   //
//////////////////////////////////////////////////////////////////////////////////////////////////////
process.stdin.resume();//so the program will not close instantly

function exitHandler(options, err) {
    //console.log("SRVR:EXITING "+id);
    //if (options.cleanup) { cleanup(); }
    if (err) console.log(err.stack);
    if (options.exit) process.exit();
}

function cleanup() {
    console.log('SRVR:clean');
    try { fs.unlinkSync("/tmp/SERVICE-"+id+".sock"); }
    catch(e) { console.log("No service socket found for "+id); }
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
    var sandbox={app:app, console:console, window:global, global:global, setTimeout:setTimeout, setInterval:setInterval}; //, require:require};
    app.__context = new vm.createContext(sandbox);
    initApp(app, firstUser);
    
    runScript(app.__context, fsp.join(appRoot,"Service.js"));
    vm.runInContext("if(typeof OnStart === 'function') OnStart();", app.__context, {filename:"droidscript_svc.js"});
}

function runScript(context, path) {
    console.log("SRVR:runScript "+path);
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
ipc.config.silent=false;
ipc.config.unlink=false;

console.log("SRVR:RUNNING SERVICE:",process.pid);

ipc.serve(
    "/tmp/SERVICE-"+id+".sock",
    function(){
        ipc.server.on('start', function(data,socket) {
            console.log("SRVR:Starting id="+id);
        });
        ipc.server.on('inituser', function(data,socket) {
            console.log("SRVR:inituser: "+data+"; users="+app.__users.length);
            data=JSON.parse(data);
            socket.__id=new Date().valueOf();
            var user={user:data.user, socket:socket};
            //console.log("socket1="+require('util').inspect(socket));
            if(app.__users.length > 0 || opts.debug) {
                console.log("SRVR:Service already initialized.");
                var idx=app.__users.findIndex(c => c.user == user.user);
                if(idx == -1) { app.__users.push(user); }
                else { app.__users[idx].socket=socket; } // Switch socket to new login
            }
            else { startService(id, user); }
        });
        ipc.server.on('message', function(data,socket) {
            ipc.log('SRVR:got a message : '.debug, data);
            ipc.server.emit(socket, 'message', data+' world');
        });
        ipc.server.on('SendService', function(data, socket) {
            console.log('SRVR:SendService : ', data);
            var user=app.__users.find(c => c.socket == socket);
            //var user=app.__users.find(c => { console.log("id1="+c.socket.__id+",id2="+socket.__id); return c.socket.__id == socket.__id; });
            if(!user) { console.log("No user found for socket"); return; }
            var msg=JSON.parse(data);
            app.__context.__msg=msg.msg; //JSON.stringify(msg.msg);
            console.log("SRVR:SendService#2: msg="+app.__context.__msg);
            vm.runInContext("OnMessage(__msg);", app.__context, {filename:"droidscript_svc.js"});

            //ipc.log('SRVR:SendService : '.debug, data);
        });
        ipc.server.on('stop', function(data, socket) { 
            console.log("SRVR:Stopping "+id);
            cleanup();
            process.exit(); 
        });
        ipc.server.on('socket.disconnected', function(socket, destroyedSocketID) {
            ipc.log('SRVR:client ' + destroyedSocketID + ' has disconnected!');
        });
    }
);

cleanup();
console.log("SRVR:START");
ipc.server.start();

//////////////////////////////////////////////////////////////////////////////////////////////////////
if(opts.debug) {
    console.log("SRVR:Debugging...");
    startService(id);
}
