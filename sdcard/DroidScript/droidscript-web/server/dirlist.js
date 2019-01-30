const fsp = require('path'); // path join
const fs  = require('fs');
const AppRoot=fsp.dirname(process.argv[1]);
const _blacklist=["/dstart","/dsmain.js","/LICENSE","/NOTES.md","/README.md","/updev.sh","/todo.txt","/tmp",
    "/node_modules","/package.json","/package-lock.json","/stopcli.sh","/testcli.sh","/test.sqlite","/testsvr.sh"
];
    //"/sdcard/DroidScript/droidscript-web"]; // Ban app write access and don't list in directory
    // node_modules  package.json  package-lock.json  stopcli.sh  testcli.sh  test.sqlite  testsvr.sh  


module.exports={
    dirlist:dirlist, 
    filterDQ: filterDQ,
    AppRoot: AppRoot,
    normalizePath: normalizePath,
    _blacklist: _blacklist
};

function normalizePath(fPath) { // PURPOSE: Eliminate root breakout attempts
    fPath=fPath.split("../").join("/").split("/").join(fsp.sep);
    return fsp.join(AppRoot, fPath); // Retrieve system resources
}

// Write a recursive directory list to tgt file, using 'this' context.
// Input context must contain 'root' (path to start at).
// It may also contain 'skip' (array of dirs to skip) and/or 'only' (array of dirs to include)
// For example:
//   dirlist.call({root:rootPath, q:['/'],skip:[apps+'droidscript-web'],only:[apps+'sample3']}, 'dirlist.txt');
function dirlist(tgt) {
    if(typeof tgt === 'string') { tgt=fs.createWriteStream(tgt); tgt.write('CACHE MANIFEST\n\nCACHE:\n'); }
    var elem=filterDQ.call(this);
    if(!elem) { tgt.end('\nNETWORK:\n*\n'); return; }

    //console.log("elem: "+elem);
    fs.stat(fsp.join(this.root, elem), function(err, stat) {
        if(err) { tgt.write('# ERR "'+elem+': '+err.message+'\n'); return; }
        var lastModified=Math.max(stat.mtime.getTime(), stat.ctime.getTime());
        tgt.write('# mod='+lastModified+', dir='+stat.isDirectory()+', size='+stat.size+'\n'+encodeURI(elem)+'\n');
    });
    
    //tgt.write('  "'+elem+'":"true",\n');
    var path=this.root+elem;    
    fs.stat(path, function(err, stat) { // Check unknown path to see if file or directory
        if(err) { console.error("stat: "+err); return; }
        var lastModified=Math.max(stat.mtime.getTime(), stat.ctime.getTime());
        if (stat.isDirectory()) {
            fs.readdir(path, ((err, list) => {
                list=list.filter( (el, idx, arr) => {
                    var sub=fsp.join(elem,el);
                    for(var xa=0; xa<_blacklist.length; xa++) {
                        var skip=_blacklist[xa];
                        if(skip === sub || el[0] == '.') { return false; } // Ignore blacklist and hidden files
                    }
                    return true;
                });
                list.forEach( ((v) => {
                    var sub=fsp.join(elem,v);
                    //console.log("this=",this);
                    this.q.push(sub);
                }).bind(this)); // Queue files
                list=JSON.stringify(list);
                //console.log("path="+elem+";data="+list);
                //this.sendUTF(JSON.stringify({"type":"sync", lastModified:lastModified, path:elem, data:list, ctype:"inode/directory"})); // Sync directory to client
                process.nextTick(() => { dirlist.call(this, tgt); });
            }).bind(this));
            return;
        }
        var ctype='text/plain'; //getContentType(path);
        process.nextTick(() => { dirlist.call(this, tgt); });
        //this.sendUTF(JSON.stringify({"type":"sync", lastModified:lastModified, path:elem, data:null, ctype:ctype})); // Sync file to client
    }.bind(this));
}

// De-Queue next element from context, filtering out elements matching skip or only arrays.
function filterDQ() {
    var elem=null;
    main:
    do {
        if(!this.q) { this.q=['/']; }
        elem=this.q.shift();
        if(!elem) { return elem; }
        if(this.skip) for(var xa=0; xa<this.skip.length; xa++) {
            if(elem === this.skip[xa]) { continue main; } // Discard (included in "skip")
        }
        if(this.only) {
            for(var xa=0; xa<this.only.length; xa++) {
                var len=Math.min(elem.length, this.only[xa].length);
                if(elem.substr(0,len) === this.only[xa].substr(0,len)) { return elem; } // If one of the "only", return it
            }
            continue main; // Else discard (not included in "only")
        }
        break;
    } while(elem);
    return elem;
}
