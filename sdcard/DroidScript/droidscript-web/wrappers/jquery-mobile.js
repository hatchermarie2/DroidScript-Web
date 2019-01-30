/* Browser-based DroidScript implementation
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

var _h = 0;
var _w = 0;
var _jqmId = 0;
var _transitionalAPI = false; // Detect use of incompatible API and switch to using it
var _files=[];
var _started = false;
var _menu="";
var _backPressed=0;
var _front_child_index=99;
var _debug=false;

_destroyed=[];

function _getGUIImpl()
{
	return new JQueryMobile();
}

function JQueryMobile()
{
	var isMobile = (/Android|webOS|iPhone|iPad|iPod|BlackBerry|BB|PlayBook|IEMobile|Windows Phone|Kindle|Silk|Opera Mini/i.test(navigator.userAgent));
	var backColor = null;
	
	function getPanelWrapper() { return $("div .ui-panel-wrapper"); }
	function getPage() { return $("div[data-role='page']"); }
	function getPageContent() {	return $("div[data-role='page'] .ui-content"); }
	function getHeader() { return $("div[data-role='header']"); }
	
	this.IsMobile = function() { return isMobile; };
	this.GetScreenWidth = function() { return $(window).width() };
 	this.GetScreenHeight = function() { return $(window).height() };
 	this.GetDisplayWidth = function() { return $(window).width() };
 	this.GetDisplayHeight = function() { return $(window).height() };
	this.GetScreenDensity = function() { return 96; }; // nominal Dots per Inch for desktop displays.  No way to actually know on the web.  See https://stackoverflow.com/questions/21680629/getting-the-physical-screen-dimensions-dpi-pixel-density-in-chrome-on-androi/25069057?utm_medium=organic
	this.SetDebugEnabled = function(enable) { _debug=enable; };
	this.GetOrientation = function() {
        if(_h > _w) { return "Portrait"; }
        return "Landscape";
    };
	
	this.CreateLayout = function( type, options ) { return new JQueryMobile_Lay(type, options);	};
	this.CreateScroller = function( width, height, options ) { return new JQueryMobile_Scr(width, height, options);	};
	this.CreateService = function( packageName, className, options, callback ) { return new JQueryMobile_Service(packageName, className, options, callback); };
    this.CreateDownloader = function() { return new JQueryMobile_Dwn(); }
	this.CreateImage = function(file, width, height, options, w, h) { return new JQueryMobile_Img(file, width, height, options, w, h); };
	this.CreateButton = function(title, width, height, options) { return new JQueryMobile_Btn(title, width, height, options); };
	this.CreateText = function(text, width, height, options) { return new JQueryMobile_Txt(text, width, height, options); };
	this.CreateTextEdit = function(text, width, height, options) { return new JQueryMobile_Txe(text, width, height, options); };
	this.CreateCheckBox = function(text, width, height, options) { return new JQueryMobile_Chk(text, width, height, options); };
	this.CreateSpinner = function(list, width, height, options) { return new JQueryMobile_Spn(list, width, height, options); };
	this.CreateList = function(list, width, height, options) { return new JQueryMobile_Lst(list, width, height, options); };
    this.CreateLocator = function(type, options) { return new JQueryMobile_Loc(type, options); };
	this.CreatePanel = function(options) 
	{ 
		var panel = new JQueryMobile_Pnl(options);
		if(panel !== null) { getPage().append(panel); }
		panel.panel();
		if( backColor ) getPanelWrapper().css("background-color", backColor);
	
		return panel;
	};
	this.CreateActionBar = function(title, buttons) 
	{ 
		var actionBar = new JQueryMobile_Bar(title, buttons);
		if(actionBar !== null) { getPage().prepend(actionBar); }
		actionBar.toolbar();

		// This seems to be required to make sure the page content
		// is resized properly once the header is made visible
		$(window).trigger('resize');
		
		return actionBar;
	};
	this.CreateDialog = function( title,options ) 
	{ 
		var dialog = new JQueryMobile_Dlg(title, options);
		if(dialog !== null)
		{ 
			getPage().append(dialog);
			dialog.popup();		
		}
		return dialog;
	};
	this.CreateYesNoDialog = function( msg ) 
	{ 
		var dialog = new JQueryMobile_Ynd(msg);
		if(dialog !== null) 
		{ 
			getPage().append(dialog);
			dialog.popup();
			dialog.popup("open");
		}
		return dialog;
	};
    this.CreateListDialog = function(title, list, options) 
    {
		var dialog = new JQueryMobile_LstDlg(title, list, options);
 		if(dialog !== null) 
 		{ 
            // Due to apparent race condition, delayed append fixes later appended elements getting duplicate not part of DOM.
 			setTimeout(function() { getPage().append(dialog); }, 0);
 			dialog.popup();
 			if(options && options.toLowerCase().indexOf('shownow') > -1) dialog.Show();
 		}
		
		return dialog;
    }
	this.CreateMap = function(url,width,height,options) { return new JQueryMobile_Map(url, width, height, options); };
    
    // NOTE: Purposely not using JQueryMobile_Websock, so existing overrides will work
    this.CreateWebSocket = function( id,ip,port,options ) { return new _WebSock( id,ip,port,options ); }
    JQueryMobile_Websock = _WebSock;

	this.AddLayout = function( layout ) { 
		getPageContent().append(layout);
        // FIXME: Reposition all children now that we have a parent (trigger FINDING PARENT)
        _updatePositions(layout[0]);
	};

	this.RemoveLayout = function( layout ) { 
		layout.detach();
	};

	this.DestroyLayout = function( layout ) { 
        console.log("FIXME: DestroyLayout: parent="+layout[0].parentElement);
        //layout[0].innerHTML="test1 DestroyLayout";
        //layout.Destroy();
		//layout.remove();
        _destroyed.push(layout);
        //layout[0].parentElement.parentElement.innerHTML="";
        document.getElementById('contentMain').innerHTML="";
	};

	this.ShowPopup = function(msg, options) {
		var duration = 3500;

		options = options ? options.toLowerCase() : "";

		if(options.indexOf("short") > -1)
		{
			duration = 2000;
		}

		$("#showPopup p").text(msg);

		// Must initialise before opening
		$("#showPopup").popup();
		$("#showPopup").popup("open");

        //console.log("OPENING Popup for "+duration);
        if(this._popupTimeout) { clearTimeout(this._popupTimeout); }
		this._popupTimeout=setTimeout(function() {
            //console.log("CLOSING Popup after "+duration);
			$("#showPopup").popup("close");
		}, duration);
	};
    this.GetThumbnail = function( srcImg, dstImg, width, height ) { 
        var path="/thumbnail?srcimg="+srcImg+"&dstimg="+dstImg+"&width="+width+"&height="+height;
        var xhReq = new XMLHttpRequest();
        xhReq.open("GET", path, false);
        xhReq.send(null);
    }
    
//        if(path[0] != '/') { path = _prefix+path; }
//         var results=[];
//         for(var xa=0; xa<localStorage.length; xa++) {
//             var key=localStorage.key(xa);
//             if(filter && key.lastIndexOf(filter) !== key.length-filter.length) { continue; }
//             if(key.indexOf(path+"/") == 0) { results.push(key); }
//         }
        //var id="FILE:"+path;
        //var file=_fetchFileSync(path);
        //var file=_retrieveFile(path);
        //console.log("file="+file+";type="+file.type);
//        if(file.type !== "inode/directory") { return ""; }
//        var data=JSON.parse(_blobToString(file));
//        console.log('ListFolder('+path+')='+JSON.stringify(data));
    this.ListFolder = function(path, filter, limit, options) {
        //console.log("ListFolder "+path);
        if(path == "/") { return ["/sdcard"]; }
        
        options = options ? options.toLowerCase() : "";
        while(path.length>1 && path[path.length-1] == '/') { path=path.substr(0,path.length-1); } // Trim trailing slashes
        var ret=_retrieveFolder(path);
        if(!ret) { return []; }
        ret=JSON.parse(ret);
        ret=filter ? ret.filter((f,x) => f.lastIndexOf(filter) === f.length - filter.length && (limit ? x <= limit : true)) : ret;
        if(options.indexOf('alphasort') > -1) ret=ret.sort();
        if(options.indexOf('fullpath') > -1) ret=ret.map(f => path+'/'+f);
        return ret;
    };
    
    this.MakeFolder = function(path) {
        console.log("MakeFolder "+path);
        if(this.FolderExists(path)) { return; }
        var prev=path.split('/').slice(0,-1).join('/');
        if(prev !== '') { this.MakeFolder(prev); } // Make parent folder(s)
        _createDirWithFilenames(path, []);
    };

    this.FolderExists = function(path) {
        return _retrieveFolder(path) != null;
    };

    this.FileExists = function(path) {
        console.log("FileExists "+path);
        var dir=path.match(/.*\//)[0].replace(/\/$/,'');
        var list=this.ListFolder(dir);
        var base=path.replace(/.*\//,"");
        //console.log(list,base);
        var isFound = list.find( (el) => { return el === base; }) != null;
        if(!isFound) { return false; }
        // Something is here, but is it a file or a folder?
        console.log("isFound=true");
        return !this.FolderExists(path); // Make sure it is not a folder
    };
    
    this.GetPrivateFolder = function(name) { // NOTE: Creates the folder when called
        // e.g. /data/user/0/com/smartphoneremote.androidscriptfree/app_test
        var uid=0; // FIXME: Need different uid for each website visitor (use cookie/login)
        var path="/data/user/"+uid+"/com/smartphoneremote.androidscriptfree/app_"+name;
        this.MakeFolder(path);
        return path;
        // NOTE: Need: Sync files/folders TO server (if permissions allow)
        // NOTE: Private folder and its contents should generally be allowed (excepting bandwidth/resource limits exceeded)
        // NOTE: Constraints per IP and/or cookie / bandwidth usage should be checked first
    };
    
    this.DeleteFile = function(path) {
        console.log("FIXME: DeleteFile (secure) unimplemented: "+path);
    };

    this.StartApp = function( file, options, intent ) {
        console.log('StartApp: file='+file+',options='+options+',intent='+intent);
        if(intent) { intent=JSON.parse(intent); }
        else intent={}; 
        if(intent.action === 'android.intent.action.VIEW') {
            var url=file.replace("/sdcard/DroidScript/","/app/").replace(/[_\-a-zA-Z0-9][_\-a-zA-Z0-9]*.js/,'');
            document.location=url;
        }
    };

    this.SetMenu = function( list, iconPath ) {
        _menu=list;
        console.log("FIXME: SetMenu");
    };
    
    this.ShowMenu = function() {
        console.log("FIXME: ShowMenu");
        alert('menu:'+_menu);
    };
    
    this._onError = function() { };
    this.SetOnError = function( callback ) {
        this._onError=callback;
    };
    
    this.EnableBackKey = function( enable ) {
        if(enable) {
            window.removeEventListener('popstate');
            console.log("FIXME: Does EnableBackKey really work?");
        }
        else {
            history.pushState(null, null, document.URL);
            window.addEventListener('popstate', function () {
                history.pushState(null, null, document.URL);                
                if(typeof OnBack === 'function' && _backPressed > 1) { OnBack(); }
                _backPressed++;
            });
        }
    };
    this.GetFileDate = function(path) {
        var xhReq = new XMLHttpRequest();
        xhReq.open("HEAD", path, false);
        xhReq.send(null);
        var d = xhReq.getResponseHeader("Last-Modified");
        //console.log("DATE status="+xhReq.status+"; path="+path+"; d="+d);
        //var clen = xhReq.getResponseHeader('Content-Length');
        //alert('clen='+clen+", "+xhReq.responseText);
        if( d ) return new Date(d);
        return null; 
    }
    
    this.ReadFile = function(path) { return _load_binary_resource(path); } //_fetchFileSync(path); };
    this.WriteFile = function(path, txt) { 
        console.log("ERROR: app.WriteFile NOT IMPLEMENTED: "+path+",txt="+txt);
    }

    this.LoadText = function( valueName, dft, shareId ) {
        if(!dft) { dft=""; }
        var id='VAL'+valueName+(shareId ? (":"+shareId) : "");
        var ref=localStorage[id];
        if(!ref) { return dft; }
        ref=JSON.parse(ref);
        return (ref.type == 'text') ? ref.val: "";
    }

    this.LoadBoolean = function( valueName, dft, shareId ) {
        if(!dft) { dft=false; }
        var id='VAL'+valueName+(shareId ? (":"+shareId) : "");
        var ref=localStorage[id];
        if(!ref) { return dft; }
        ref=JSON.parse(ref);
        return (ref.type == 'boolean') ? ref.val: false;
    }

    this.LoadNumber = function( valueName, dft, shareId ) {
        if(!dft) { dft=0; }
        var id='VAL'+valueName+(shareId ? (":"+shareId) : "");
        var ref=localStorage[id];
        if(!ref) { return dft; }
        ref=JSON.parse(ref);
        return (ref.type == 'number') ? ref.val: 0;
    };
    
    this.SaveNumber = function( valueName, val, shareId ) {
        var id='VAL'+valueName;
        localStorage[id]=JSON.stringify({type:'number', val:val, share:shareId});
    }

	this.SetBackColor = function( clr ) { backColor = clr; getPage().css("background-color", clr); getPanelWrapper().css("background-color", clr); };

	this.ShowProgress = function(msg, options, clr ) { _loadProgress(-1, msg); };
	this.HideProgress = function() { _loadProgress(-1, null); };

}

function _updatePositions(element) {
    if(!element) { return; }
    if(element && element.id && element.id == "lay29") { console.log("Updating POSITIONS "+(element.id?element.id:"(null)")); }
    var es=element.style;
    if(element && element.id && element.id == "lay29") { console.log("es POS top="+es.top+";left="+es.left); }
    if(es && es.left != "" && es.top != "" && typeof parseFloat(es.left) === "number" && typeof parseFloat(es.top) === "number") {
        var left=parseFloat(es.left)/100;
        var top=parseFloat(es.top)/100;
        if(element && element.id && element.id == "lay29") { console.log("_SetPOS "+top); }
        _SetPosition(element,left,top);
    }
    var chn=element.children;
    for(var xa=0; xa<chn.length; xa++) { _updatePositions(chn[xa]); }
    //console.log("Updating POSITIONS done "+element.id);
}

function JQueryMobile_Lay(type, options)
{
	var lay = $("<div>");
    lay.attr("class", "lay");
	//lay.css( { display:"block", "text-align":"center", "white-space":"nowrap", "overflow":"hidden", "margin": "0px", "padding": "0px" } );
	_initObj(lay);
	lay.attr("id", "lay" + (++_jqmId));
    lay.hide = function() {
        //console.log("HIDE "+lay.css("id")+new Error().stack);
        lay.css( { visibility:"hidden" } );
    };
    lay.show = function() {
        //console.log("HIDE "+lay.css("id")+new Error().stack);
        lay.css( { visibility:"visible" } );
    };

	options = options ? options.toLowerCase() : "";

	if(options.indexOf("fillxy") > -1)
	{
		lay.css( { width:"100%", height:"100%" } );
	}
	else if(options.indexOf("fillx") >-1)
	{
		lay.css( { width:"100%" } );
	}
	else if(options.indexOf("filly") >-1)
	{
		lay.css( { height:"100%" } );
	}
	if(options.indexOf("left") >-1)
	{
		lay.css( { "text-align": "left" } );
	}
	else if(options.indexOf("right") >-1)
	{
		lay.css( { "text-align": "right" } );
	}
	else {
		lay.css( { "text-align": "center" } );
    }

	var orientation = "vertical";
    var absoluteLayout=false;

    if(type) {
        type = type.toLowerCase();
        if(type=="horizontal" || type=="vertical") { _transitionalAPI=true; } // DroidScript API uses options for this
        if(type=="absolute") { absoluteLayout=true; }
    }
	if(options.indexOf("horizontal") >-1 || 
        type && type.toLowerCase()=="horizontal") // Web-only API
	{
		orientation = "horizontal";
	}

	lay.AddChild = function( child ) 
	{ 
		if(orientation === "vertical")
		{
			child.removeClass("horizontal-child");
			child.addClass("vertical-child");
		}
		else
		{
			if( options.indexOf("vcenter") > -1 ) {
				child.removeClass("vertical-child");
				child.addClass("horizontal-child-vcenter");
			}
			else {
				child.removeClass("vertical-child");
				child.addClass("horizontal-child");
			}
		}

        // NOTE: Below is a hack that will not always work, if partially covered siblings should receive events over the uncovered area.
        // NOTE: This is to solve an issue with background siblings stealing events even though their z-order is lower.
 		var children=lay[0].children;
 		for(var xa=0; xa<children.length; xa++) {
            var sibling=children[xa];
            if(sibling.id.indexOf('imgwrap') > -1) {
                var schild=sibling.children[0];
                schild.style.pointerEvents="none"; // Make background siblings inactive
                console.log("DEACTIVATED "+schild.id);
            }
         }
         if(absoluteLayout) { _wrapAppendIfImage(lay, child); }
         else { lay.append( child ); }
        
        child[0].style.pointerEvents=""; // Make foreground child active.
        //lay.append( child );

        //if(orientation === "vertical")
        //    lay.append("<br>");
        
		if(child.init)
			child.init();
        
        _updatePositions(child); // Reposition child now that it has a parent
	};
    
    lay.ChildToFront = function() {
        lay.css( {"z-index": _front_child_index++} );
    };
    
    lay.Animate = function(type, callback) {
        lay.animate({width: "toggle"});
    };
    
    lay.detach = function() { console.log("FIXME: JQueryMobile_Lay.detach is not implemented"); };

    //console.log("ID: "+lay.attr("id")+"; style: "+lay.attr("style"));
	//lay.css( { height:"100%" } ); // FIXME: Setting height 100% to avoid height: 0px
	return lay;
}

// Set child "overflow":"auto" 
function _autoScrollChild(lay, child) {
    child.css({overflow:"visible"}); // or auto, inherit, visible
    console.log("FIXME: _autoScrollChild for all descendends");
}

// Append child to layout, wrapping images in a relative positioned div, but positioning child absolute or fixed at top/left
function _wrapAppendIfImage(lay, child) {
    console.log("APPENDING lay="+lay[0].id);
    var tgt=lay;
    var chid=child.attr("id");
    if(chid && chid.indexOf('img') == 0) {
        console.log("IMG:"+lay.attr("id")+".AddChild "+chid); 
        var t=lay.children('div');
        var found=false;
        for(var xa=0; xa<t.length; xa++) {
            var id=t[xa].id;
            console.log("id="+id);
            if(id.indexOf('imgwrap') === 0) { tgt=$(t[xa]); found=true; break; }
        }
        console.log("found="+found+";tgt="+tgt);
        _tgt=tgt;
        if(!found) {
            tgt = $("<div>");
            tgt.attr("id", "imgwrap" + (++_jqmId));
            // lay.css( { position:"relative", width:"95vw", height:"90vh" } );
            var maxw=child.css("width");  // FIXME: Set to maximum of all widths/heights of this child and other children of this layout
            var maxh=child.css("height"); // FIXME: Also, need to update every time child resizes
            tgt.css( { position:"relative", width:maxw, height:maxh } );
            child.css( { position:"absolute" } );
            if(child.css("left") == "auto" && child.css("top") == "auto") { // Override position if not set already
                child.css( { left:"0px", top:"0px" } );
            }
            lay.append(tgt);
        }
    }

    tgt.append( child );

}

function JQueryMobile_Loc(type, options) {
    this._errorCount=0;
    function locError(error) {
        switch(error.code) {
            case error.PERMISSION_DENIED:
                console.log("JQueryMobile_Loc: User denied the request for Geolocation.");
                break;
            case error.POSITION_UNAVAILABLE:
                console.log("JQueryMobile_Loc: Location information is unavailable.");
                break;
            case error.TIMEOUT:
                console.log("JQueryMobile_Loc: The request to get user location timed out.");
                break;
            case error.UNKNOWN_ERROR:
                console.log("JQueryMobile_Loc: An unknown error occurred.");
                break;
        }
        if(++this._errorCount >= 10) {
            this.Stop(); // Turn off if error count is excessive
        }
    } 

    this._rate=1;
    this._timerId=null;
    this._callback=function() {};
    
    this.SetOnChange = function( callback ) { this._callback=callback; } 
    this.Start = function() {
        this._timerId=setInterval(function() {
            if(navigator.geolocation) { 
                navigator.geolocation.getCurrentPosition(this._callback, locError.bind(this)); }
        }.bind(this), this._rate*1000);
    }
    this.Stop = function() {
        if(this._timerId) { clearInterval(this._timerId); this._timerId=null; }
    }
    this.SetRate = function( rate ) {
        var o=this._rate;
        this._rate=rate;
        if(o != rate && this._timerId) { this.Stop(); this.Start(); } // Restart if already running at a different rate
    } 
    this.GetDistanceTo = function( lat,lng ) { return parseFloat(this.impl.GetDistanceTo(lat, lng)); }
    this.GetBearingTo = function( lat,lng ) { return parseFloat(this.impl.GetBearingTo(lat, lng)); }
}

function JQueryMobile_Dwn() {
    var dwn={};
        
    dwn.SetOnComplete = function( callback ) { dwn.callback=callback; };
    
    dwn.Download = function(url, tgt) {
        //window.location=url;
        window.open(url, "_blank"); // Download tgt is ignored on this platform
    };
    
    return dwn;
//     obj.Download = function( url,dest ) { this.impl.Download(url, dest); }
//     obj.IsComplete = function() { return this.impl.IsComplete(); } 
//     obj.GetProgress = function() { return this.impl.GetProgress(); }  
//     obj.GetSize = function() { return this.impl.GetSize(); }  
//     obj.SetOnComplete = function( callback ) { this.impl.SetOnComplete(callback); }
//     obj.SetOnError = function( callback ) { this.impl.SetOnError(callback); }
}

function JQueryMobile_Scr(width, height, options)
{
	var scr = $("<div>");
	scr.css( { display:"block", "text-align":"center", "white-space":"nowrap", "overflow":"hidden", 
        "overflow-x": "scroll", "overflow-y":"scroll", "height":"100vh", "width":"98vw",
        "background-color":"black" } );
	_initObj(scr);
    scr.attr("id", "scr" + (++_jqmId));

	options = options ? options.toLowerCase() : "";

	if(options.indexOf("fillxy") > -1)
	{
		scr.css( { width:"100%", height:"100%" } );
	}
	else if(options.indexOf("fillx") >-1)
	{
		scr.css( { width:"100%" } );
	}
	else if(options.indexOf("filly") >-1)
	{
		scr.css( { height:"100%" } );
	}
	if(options.indexOf("left") >-1)
	{
		scr.css( { "text-align": "left" } );
	}
	else if(options.indexOf("right") >-1)
	{
		scr.css( { "text-align": "right" } );
	}

	scr.AddChild = function( child ) 
	{ 
        child.removeClass("horizontal-child");
        child.addClass("vertical-child");

   		_wrapAppendIfImage(scr, child);
        _autoScrollChild(scr, child);


		scr.append("<br>");

		if(child.init)
			child.init();
	};
    
/*    // Remaining to implement:
    obj.RemoveChild = function( child ) { this.impl.RemoveChild(child.impl); } //prompt( obj.id, "Scr.RemoveChild(\f"+(child?child.id:null) ); }    
    obj.DestroyChild = function( child ) { this.impl.DestroyChild(child.impl); } //prompt( obj.id, "Scr.DestroyChild(\f"+(child?child.id:null) ); }  
    obj.ScrollTo = function( x,y ) { this.impl.ScrollTo(x,y); } //prompt( obj.id, "Scr.ScrollTo\f"+x+"\f"+y ); }
    obj.ScrollBy = function( x,y ) { this.impl.ScrollBy(x,y); } // prompt( obj.id, "Scr.ScrollBy\f"+x+"\f"+y ); }
    obj.GetScrollX = function() { return this.impl.GetScrollX(); } // parseFloat(prompt( obj.id, "Scr.GetScrollX(" )); }
    obj.GetScrollY = function() { return this.impl.GetScrollY(); } // (prompt( obj.id, "Scr.GetScrollY(" )); }
*/    
	return scr;
}

// NOTE: This is used to handing drawing commands sent to an image that is loading asynchronously.
// NOTE: While the image is loading, the commands are buffered, then sent once loading is complete.
// NOTE: if runFirst is true, commands will be run twice, initially while being buffered, and again
// NOTE: when _replay() is called.
function _ReplayMethodCalls(obj, runFirst)
{
    var runNow=false;
    var buffer=[];
    const handler = {
        get(target, propKey, receiver) {
            const targetValue = Reflect.get(target, propKey, receiver);
            if (typeof targetValue === 'function') {
                return function (...args) {
//                    console.log('REPLAY:CALL', propKey, args);
                    buffer.push({fn:targetValue, obj:this, args:args});
                    try { if(runFirst) return targetValue.apply(this, args); } // (A)
                    catch(e) {
                        console.log("ERROR in "+this.constructor.name+": "+e.message);
                    }
                }
            } else {
                if(!targetValue && propKey == '_replay') {
                    return function (...args) {
                        runNow=true;
                        var cmd=null;
                        //console.log("REPLAYing "+buffer.length+" calls");
                        while(cmd=buffer.shift()) { 
//                            console.log('REPLAY type '+(typeof cmd.obj)+', obj='+obj);
//                            _fn=cmd.fn; _obj=cmd.obj; __obj=obj; _args=cmd.args;
                            cmd.fn.apply(obj, cmd.args); }
                        return;
                    }
                }
//                console.log('REPLAY:GET',targetValue+', propKey='+propKey);
                return targetValue;
            }
        },
        set(target, propKey, value) {
            //console.log('SET',target,propKey,value);
            if(runFirst || runNow) target[propKey]=value;
            buffer.push({fn:function() { target[propKey]=value; }, obj:this, args:null});
        }
    };
    return new Proxy(obj, handler);    
}

/**
 * REPLAY LIMG:/sdcard/ConexKeeper-2/maps/map3final-59.036104_-158.531487.v3.png;id=img121;cw=1280;ch=2690;scale=1.1437074829931972 jquery-mobile.js:627:9
REPLAYing 569 calls jquery-mobile.js:585:25
REPLAY LIMG:/sdcard/ConexKeeper-2/maps/map3final-59.036104_-158.531487.v3.png;id=img120;cw=0;ch=0;scale=0 jquery-mobile.js:627:9
REPLAYing 0 calls

**/
function JQueryMobile_Img(file, width, height, options, w, h)
{
    this._width=width; this._height=height;
	var w = width, h = height;
	var img = $("<canvas>Your browser does not support Canvas</canvas>");
	_initObj(img);
    img.attr("border","1px solid #ff0000");
    var imgId="img" + (++_jqmId);
    img.attr("id", imgId);
	_setSize(img, width, height, options, true);
    console.log("drawPhotos:width="+img[0].width+",sw="+img[0].style.width+"; height="+img[0].height+",sh="+img[0].style.height);
    img._textStyle="";
    img._textSize="10pt";
    img._textFont="sans-serif";
    img._paintColor="black"; // default
    //img.width=width; img.height=height;
    img._drawq=[]; // List of other images waiting to draw this image (when it loads)
    img._waitList=[]; // Associative array keyed on IDs of images this image is waiting to draw
    //console.log("IMG:"+file+";id="+img.attr("id"));
    var realCtx=img[0].getContext("2d");
    var fakeCtx = new _ReplayMethodCalls(realCtx); // Handle commands sent to asynchronously-loading image
    var ctx = file?fakeCtx:realCtx;
    ctx.translate(0.5,0.5); // Put lines on half-pixels -- origin is the middle of each pixel.
    
	options = options ? options.toLowerCase() : "";
    
    img._scale = function(...args) {
        var w=this.width(), h=this.height();
        var scale=Math.min(w, h);
        for(var xa=0; xa<args.length; xa++) {
            args[xa]*= (xa==0?w:(xa==1?h:scale));
        }
        return args;
    }
    img._notifyReady = function(imgId) {
        //console.log("IMG DrawImage:drawPhotos:"+imgId);
        delete img._waitList[imgId]; // No longer waiting for this image.
        var count=0;
        for(id in img._waitList) { count++; }
        // If no images to wait for, draw buffered commands
        if(count === 0) { 
            //console.log("IMG notifyReady ALL READY DrawImage:drawPhotos:src="+img._initImg.src);
            ctx._replay(); ctx=realCtx; 
        }
    }
    img.touchable=false;

    //                        thumb,0,0,-1,1,0
    img.DrawImage = function( image,x,y,w,h,angle,mode ) { 
        if(!image._ready) { // If any image we try to draw is not ready, buffer future commands until all images are ready
            ctx=fakeCtx;
            img._waitList[image.attr("id")]=image;
            image._drawq.push(img);
            //console.log("IMG:DrawImage:drawPhotos (not ready) IN "+img[0].id+":"+image._initImg.src);
        }
        if(w<0) { w=1; }
        if(h<0) { h=1; }
        [x,y,w,h]=img._scale(x,y,w,h);
        //console.log("IMG:DrawImage:drawPhotos:#"+image[0].id+";"+image._initImg.src+" ONTO "+img._initImg.src+" AT x="+x+",y="+y+",w="+w+",h="+h+"; img._ready="+img._ready+";image._ready="+image._ready);
        ctx.drawImage(image[0], x, y, w, h, 0,0, w, h);
    }
	img.Clear = function() { console.log("img.Clear not implemented"); } 
    img.Update = function() { console.log("img.Update not implemented"); }
    img.SetAutoUpdate = function( onoff ) { console.log("img.SetAutoUpdate not implemented"); }
    img.SetName = function( name ) { console.log("img.SetName not implemented"); }
    img.GetName = function() { console.log("img.GetName not implemented"); return ""; }
    img.SetImage = function( image,width,height,options ) {
//         var newImg=new Image();
//         newImg.src=image;
//         newImg.onload = function() { 
//             //ctx.drawImage(newImage, 0, 0); }
//             var scaleX = canvas.width/img._initImg.naturalWidth;
//             var scaleY = canvas.height/img._initImg.naturalHeight;
//             var scale = scaleX < scaleY ? scaleX : scaleY;
//             realCtx.drawImage(img._initImg, 0, 0, img._initImg.naturalWidth, img._initImg.naturalHeight, 0,0, img._initImg.naturalWidth*scale, img._initImg.naturalHeight*scale);
//         
//         }
//     	//img.attr("src", image);
//     	_setSize(img, width?width:w, height?height:h, options);
        img._initImg=new Image();
        img._initImg.onload = function() { 
            var canvas=img[0];
            var scaleX = canvas.width/img._initImg.naturalWidth;
            var scaleY = canvas.height/img._initImg.naturalHeight;
            var scale = scaleX < scaleY ? scaleX : scaleY;
//             console.log("IMG:drawPhotos: scaleX="+scaleX+",scaleY="+scaleY+"; src="+img._initImg.src);
//             console.log("IMG:drawPhotos:sw="+canvas.style.width+" WAS "+canvas.width);
//             console.log("IMG:drawPhotos:sh="+canvas.style.height+" WAS "+canvas.height);
    
//             if(canvas.style.width !== "") { canvas.width=parseInt(canvas.style.width); }
//             else { canvas.style.width=canvas.width+"px"; }
//             if(canvas.style.height !== "") { canvas.height=parseInt(canvas.style.height); }
//             else { canvas.style.height=canvas.height+"px"; }
            if(!width || !height) {
                var sw=width ? width : scaleX;
                var sh=height ? height : scaleY;
                //console.log("IMG:resetting size:drawPhotos: sw="+sw+",sh="+sh+"; src="+img._initImg.src);
                _setSize(img, sw, sh, options);
            }
        
            //_canvas=canvas;
            //console.log("IMG:DrawImage:drawPhotos: READY:scale="+scale+";id="+img.attr("id")+";src="+img._initImg.src);
            if(scale>0) {
                //_img=img._initImg;
                //_ctx=realCtx;
                //console.log("REPLAY drawPhotos LIMG:"+image+";id="+img.attr("id")+";cw="+canvas.width+";ch="+canvas.height+";scale="+scale);
                realCtx.drawImage(img._initImg, 0, 0, img._initImg.naturalWidth, img._initImg.naturalHeight, 0,0, img._initImg.naturalWidth*scale, img._initImg.naturalHeight*scale);
                ctx._replay(); // Draw buffered commands after drawing image
                ctx=realCtx;
                //_saveCtx=ctx;
            }
            //console.log("DrawImage:drawPhotos:READY "+img.attr("id")+";drawq="+img._drawq.length+";"+JSON.stringify(img._drawq));
            img._ready=true;
            var i;
            while(i=img._drawq.shift()) { i._notifyReady(imgId); }
        }
        if(image) {
            img._ready=false; // Are we ready to be drawn?
            img._initImg.src=image; // Asynchronously load this image
        }
        else { img._ready=true; }
        //console.log("DrawImage:DrawPhotos:_ready="+img._ready+";"+img._initImg.src);
	}
	img.GetPixelData = function( format,left,top,width,height ) { console.log("img.GetPixelData not implemented"); return null; }
    img.SetSize = function( width,height ) { this._width=width; this._height=height; _setSize(img); }
    img.GetHeight = function() { return this._height; }
    img.GetWidth = function() { return this._width; }
    img.GetAbsHeight = function() { return this._height; }
    img.GetAbsWidth = function() { return this._width; } 
    img.SetOnTouch = function( callback )       { _handleTouchEvent.call(img, img.click, "Down", callback); } 
    img.SetOnTouchUp = function( callback )     { _handleTouchEvent.call(img, img.mouseup, "Up", callback); }
    img.SetOnTouchMove = function( callback )   { _handleTouchEvent.call(img, img.mousemove, "Move", callback); }
    img.SetOnTouchDown = function( callback )   { _handleTouchEvent.call(img, img.mousedown, "Down", callback); } 
    img.SetOnLongTouch = function( callback )   { _handleTouchEvent.call(img, img.contextmenu, "Context", callback); }   
    img.SetTouchable = function( touchable ) { img.touchable=touchable; }
 //    img.SetOnLoad = function( callback ) { this.impl.SetOnLoad(callback); }
 //    img.SetMaxRate = function( ms ) { this.impl.SetMaxRate(ms); }
	// 	if( obj._auto ) this.impl.DrawImage((image?image.impl:null), x, y, w, h, angle, mode); 
	// 	else this.Draw( "i", (image?image.id:null), x,y,(w?w:-1),(h?h:-1),angle,mode ); }
	// obj.DrawImageMtx = function( image,matrix ) { 
	// 	if( obj._auto ) this.impl.DrawImageMtx((image?image.impl:null), matrix); 
	// 	else this.Draw( "m", (image?image.id:null), matrix ); }
 //    obj.DrawPoint = function( x,y ) { 
	// 	if( obj._auto ) this.impl.DrawPoint(x, y); else this.Draw( "p", null, x,y ); }
    img.DrawCircle = function( x,y,radius ) {
        ctx.beginPath();
        [x,y,radius]=img._scale(x,y,radius);
        //console.log("DrawCircle: x="+x+",y="+y+",radius="+radius);
        ctx.arc(x, y, radius, 0, 360);
        ctx.stroke();
    }
 //    obj.DrawArc = function( x1,y1,x2,y2,start,sweep ) { 
	// 	if( obj._auto ) this.impl.DrawArc(x1, y1, x2, y2, start, sweep);
	// 	else this.Draw( "a", null, x1,y1,x2,y2,start,sweep ); }
    img.DrawLine = function( x1,y1,x2,y2 ) { 
        [x1,y1]=img._scale(x1,y1);
        [x2,y2]=img._scale(x2,y2);
        ctx.beginPath();
        ctx.moveTo(x1,y1);
        ctx.lineTo(x2,y2);
        ctx.stroke();
    }
 //    obj.DrawRectangle = function( x1,y1,x2,y2 ) { 
	// 	if( obj._auto ) this.impl.DrawRect(x1, y1, x2, y2);
	// 	else this.Draw( "r", null, x1,y1,x2,y2 ); 
        
    //}
    img.DrawText = function( txt,x,y ) { [x,y]=img._scale(x,y); ctx.fillText(txt, x, y); }
    img.SetAlpha = function( alpha ) { img.css("opacity", alpha ); }
    img.SetColor = function( clr ) { //img.css("color", clr); 
        ctx.fillStyle=clr;
        //console.log("drawPhotos:SetColor:width="+this.width()+",height="+this.height()+",clr="+clr);
        ctx.fillRect(0,0,this.width(),this.height());
    }
    img.SetTextSize = function( size ) { img._textSize=(size)+"pt"; ctx.font=img._textStyle+" "+img._textSize+" "+img._textFont; }
 //    obj.SetFontFile = function( file ) { if( obj._auto ) this.impl.SetFontFile(file); else this.Draw( "f",file ); }  
    img.SetLineWidth = function( width ) { ctx.lineWidth=width;  }
    img.SetBackColor = function( clr ) { img._backColor=clr; ctx.fillStyle=img._backColor; }
    img.SetPaintColor = function( clr ) { img._paintColor=clr; ctx.fillStyle=ctx.strokeStyle=img._paintColor; }
 //    obj.SetPaintStyle = function( style ) { if( obj._auto ) this.impl.SetPaintStyle(style); else this.Draw( "s",style ); } 
 //    obj.Rotate = function( angle,pivX,pivY ) { this.impl.Rotate(angle, pivX, pivY); }
 //    obj.Move = function( x,y ) { this.impl.Move(x, y); }
 //    obj.Scale = function( x,y ) { this.impl.Scale(x, y); }
 //    obj.Skew = function( x,y ) { this.impl.Skew(x, y); }
 //    obj.Transform = function( matrix ) { this.impl.Transform(matrix); }
 //    obj.Reset = function() { this.impl.Reset(); }
    img.Save = function( fileName,quality ) { 
        console.log("ERROR: img.Save NOT IMPLEMENTED!: "+fileName+",quality="+quality);
    };
 //    obj.Draw = function( func, p1, p2, p3, p4, p5, p6, p7 ) {
	// 	if( obj._gfb.length > 2 ) obj._gfb += "\f";
	// 	obj._gfb += func + "¬" + p1 + "¬" + p2 + "¬" + p3 + "¬" + p4 + "¬" + p5 + "¬" + p6 + "¬" + p7;
	// }

    img.SetImage(file, width, height, options);
	return img;
}

function JQueryMobile_Btn(title, width, height, options)
{
	options = options ? options.toLowerCase() : "";
	var button,fileInput,btn,onUpload;
	
	var filestack = (options.indexOf("filestack") > -1 );
	if( false && filestack ) {
		button = $("<div>");
		fileInput = $("<input type=\"filepicker\" data-fp-apikey=\"A1KC38flRmucYlZyZRVLLz\" data-fp-mimetypes=\"image/*\" data-fp-container=\"modal\" data-fp-maxsize=\"300000\" data-fp-services=\"COMPUTER,DROPBOX,FACEBOOK,GOOGLE_DRIVE,INSTAGRAM,IMAGE_SEARCH,WEBCAM\" onchange=\"alert(event.fpfile.url)\">");
		button.append( fileInput );
	}
	//else button = $("<a href=\"#\" class=\"ui-btn ui-shadow ui-btn-inline ui-corner-all no-mXargin\">" + title + "</a>");
	else button = $("<a href=\"#\" class=\" ui-btn2\">" + title + "</a>");
	_initObj(button);
	button.attr("id", "btn" + (++_jqmId));

	_setSize(button, width, height, options);
	if(options.indexOf("mini") >= 0) button.addClass("ui-mini");
	
	button.pick = function()
	{
		var mode = options.indexOf("window")>-1 ? 'window' : 'modal';
		filepicker.setKey( "A1KC38flRmucYlZyZRVLLz" );
		filepicker.pick( {
			services: ['CONVERT','COMPUTER','DROPBOX','FACEBOOK','GOOGLE_DRIVE','INSTAGRAM','IMAGE_SEARCH','WEBCAM'],
			conversions: ['crop', 'rotate', 'filter'], mimetype: 'image/*', container: mode,
			ximageDim: [800,600], xcropDim: [800,600], cropRatio: [8/6], cropForce: false
		 },
		 function( blob ) {
			console.log(JSON.stringify(blob))
			if( onUpload ) onUpload( blob.url );
		 },
		 function(FPError){ console.log(FPError.toString()); }
		);
	}

	button.SetOnClick = function(callback) { if( filestack ) { onUpload=callback; button.click(function(){button.pick();});} else button.click(callback); }
    button.SetText = function( text ) { button.text(text); }   
    button.SetHtml = function( html ) { button.html(html); }  
    button.GetText = function() { return button.text(); }  
    button.SetTextColor = function( clr ) { button.css("color", clr); }    
    button.SetFontFile = function( file ) { console.log("SetFontFile not implemented"); }  
    button.SetTextShadow = function( radius,dx,dy,color ) { console.log("SetTextShadow not implemented"); } 
    button.SetTextSize = function( size,mode ) { button.css("font-size", size); }   
    button.GetTextSize = function( mode ) { return button.css("font-size"); }
    button.SetStyle = function( clr1,clr2,radius,strokeClr,strokeWidth,shadow ) { console.log("SetStyle not implemented"); } 

	return button;
}

function JQueryMobile_Chk(text, width, height, options)
{
	var checkbox = $("<label>");
	checkbox.append("<input type=\"checkbox\">" + text);
	checkbox.css("margin", 0);
	_initObj(checkbox);
	checkbox.attr("id", "chk" + (++_jqmId));

	_setSize(checkbox, width, height, options);

	options = options ? options.toLowerCase() : "";

	checkbox.SetOnTouch = function( callback ) { checkbox.click(callback); }
    checkbox.SetText = function( text ) { checkbox.text(text); }    
    checkbox.GetText = function() { return checkbox.text(); }   
    checkbox.SetTextColor = function( clr ) { checkbox.css("color", clr); }    
    checkbox.SetTextSize = function( size,mode ) { checkbox.css("font-size", size); }   
    checkbox.GetTextSize = function( mode ) { return checkbox.css("font-size"); }  
    checkbox.SetChecked = function( checked ) { checkbox.prop("checked", checked).checkboxradio("refresh"); }   
    checkbox.GetChecked = function() { return checkbox.prop("checked"); }

    checkbox.checkboxradio();

	return checkbox;
}

function JQueryMobile_Txt(text, width, height, options)
{
	options = options ? options.toLowerCase() : "";
	
	var txt = $("<div></div>");
    txt.attr("class", "txt");
	_initObj(txt);
	txt.attr("id", "txt" + (++_jqmId));
	_setSize(txt, width, height, options);

    // Handle FontAwesome
    if(text.indexOf('[fa-') > -1) {
        text=text.replace(/\[(fa\-[a-z][a-z][a-z\-]*)\]/g,'<span class="fas $1"></span>');
        options += ",html";
    }
		
	if(options.indexOf("html") >= 0) txt.html( text );
	else txt.text( text );

	if(options.indexOf("left") > -1) txt.css("text-align", "left");
	else if(options.indexOf("right") > -1) txt.css("text-align", "right");
	
	//txt.css( "word-wrap", "break-word" );
	if( options.indexOf("multiline") > -1) txt.css( "white-space", "normal" );
	if( options.indexOf("bold") > -1 ) txt.css( "font-weight", "600" );

    txt.touchable=false; // by default
	txt.SetText = function( text ) { txt.text(text); }  
    txt.SetHtml = function( html ) { txt.html(html); } 
    txt.Log = function( msg,options ) { console.log("Log not implemented"); } 
    txt.SetLog = function( maxLines ) { console.log("SetLog not implemented"); } 
    txt.SetTextSize = function( size,mode ) { txt.css("font-size", size); }   
    txt.GetTextSize = function( mode ) { return txt.css("font-size"); }  
    txt.GetText = function() { return txt.text(); }  
    txt.SetTextColor = function( color ) { txt.css("color", color); }    
    txt.SetFontFile = function( file ) { console.log("SetFontFile not implemented"); }   
    txt.GetLineCount = function() { console.log("GetLineCount not implemented"); return 0; }   
    txt.GetMaxLines = function() { console.log("GetMaxLines not implemented"); return 0; }   
    txt.GetLineTop = function( line ) { console.log("GetLineTop not implemented"); return 0; }   
    txt.GetLineStart = function( line ) { console.log("GetLineStart not implemented"); return 0; }  
    txt.SetEllipsize = function( mode ) { console.log("SetEllipsize not implemented"); return 0; } 
    txt.SetTextShadow = function( radius,dx,dy,color ) { console.log("SetTextShadow not implemented"); return 0; }   
    
    txt.SetTouchable = function( touchable ) { txt.touchable=touchable; }
    
    txt.SetOnTouch = function( callback )       { _handleTouchEvent.call(txt, txt.click, "Down", callback); } 
    txt.SetOnTouchUp = function( callback )     { _handleTouchEvent.call(txt, txt.mouseup, "Up", callback); }
    txt.SetOnTouchMove = function( callback )   { _handleTouchEvent.call(txt, txt.mousemove, "Move", callback); }
    txt.SetOnTouchDown = function( callback )   { _handleTouchEvent.call(txt, txt.mousedown, "Down", callback); } 
    txt.SetOnLongTouch = function( callback )   { _handleTouchEvent.call(txt, txt.contextmenu, "Context", callback); }   

	return txt;
}

function JQueryMobile_Txe(text, width, height, options)
{
	options = options ? options.toLowerCase() : "";
	var multiline = (options.indexOf("multiline")>-1);
	var date = (options.indexOf("date")>-1);
	
	var txe,txeInput;
	if( !multiline ) 
	{
		txe = $("<div class=\"ui-input-text ui-body-inherit ui-corner-all ui-shXadow-inset no-margin\">");
		if( date ) { txeInput = $("<input class=\"date-input-css\" value=\""+text+"\">"); txeInput.datepicker(); }
		else txeInput = $("<input value=\""+text+"\">");
		txe.append(txeInput);
	}
	else {
		txe = txeInput = $("<textarea class=\"ui-input-text ui-body-c ui-corner-all ui-shXadow-inset\">"+text+"</textarea>");
	}
	_initObj(txe);
	txe.attr("id", "txe" + (++_jqmId));
	_setSize(txe, width, height, options);

	if(options.indexOf("password") > -1)
		txeInput.attr("type", "password");
	else
		txeInput.attr("type", "text");

	txe.keyup(function() {
		if(txe.onChangeCallback)
			txe.onChangeCallback();
	})

	txe.SetText = function( text ) { txeInput.val(text); }  
    txe.SetHtml = function( html ) { console.log("SetHtml not implemented"); } 
    txe.SetTextSize = function( size,mode ) { txe.css("font-size", size); }   
    txe.GetTextSize = function( mode ) { return txe.css("font-size"); }  
    txe.GetText = function() { return txeInput.val(); }
    txe.GetHtml = function() { console.log("GetHtml not implemented"); return txe.val(); } 
    txe.SetHint = function( text ) { txeInput.attr("placeholder", text); } 
    txe.SetTextColor = function( color ) { txe.css("color", color); } 
    txe.GetLineCount = function() { console.log("GetLineCount not implemented"); return 0; }   
    txe.GetMaxLines = function() { console.log("GetMaxLines not implemented"); return 0; }   
    txe.GetLineTop = function( line ) { console.log("GetLineTop not implemented"); return 0; }   
    txe.GetLineStart = function( line ) { console.log("GetLineStart not implemented"); return 0; }  
   	txe.SetOnTouch = function( callback ) { txe.click(callback); }
    txe.InsertText = function( text,start,end ) { console.log("InsertText not implemented"); }  
    txe.ReplaceText = function( text,start,end ) { console.log("ReplaceText not implemented"); }  
    txe.SetOnChange = function( callback ) { txe.onChangeCallback = callback; }  
    txe.SetCursorPos = function( pos ) { console.log("SetCursorPos not implemented"); }  
    txe.GetCursorPos = function() { console.log("GetCursorPos not implemented"); return 0; }   
    txe.GetCursorLine = function() { console.log("GetCursorLine not implemented"); return 0; }  
    txe.SetSelection = function( start,stop ) { console.log("SetSelection not implemented"); } 
    txe.GetSelectedText = function() { console.log("GetSelectedText not implemented"); return 0; }  
    txe.GetSelectionStart = function() { console.log("GetSelectionStart not implemented"); return 0; }  
    txe.GetSelectionEnd = function() { console.log("GetSelectionEnd not implemented"); return 0; }   
    txe.Undo = function() { console.log("Undo not implemented"); }   
    txe.Redo = function() { console.log("Redo not implemented"); }  
    txe.ClearHistory = function() { console.log("ClearHistory not implemented"); }

	return txe;
}

function JQueryMobile_Spn(list, width, height, options)
{
	var spn = $("<div class=\"ui-field-contain no-margin\">");
	var spnSelect = $("<select>");
	spn.append(spnSelect);
	_initObj(spn);
	spn.attr("id", "spn" + (++_jqmId));
	_setSize(spn, width, height, options);

	function setList(list, delim)
	{
		spnSelect.empty();

		var items = list.split(delim);
		for(var i = 0; i < items.length; ++i)
		{
			var item = $("<option value=\"" + items[i] + "\">" + items[i] + "</option>");
			spnSelect.append(item);
		}

		spnSelect.val(items[0]).selectmenu('refresh');
	}

	spnSelect.selectmenu();
	setList(list, ",");

	spnSelect.change(function () {
		if(spn.onChangeCallback)
		{
	    	spn.onChangeCallback($(this).val());
	    }
	});

	spn.init = function() {
		spnSelect.selectmenu();
	}

   	spn.SetOnTouch = function( callback ) { spn.click(callback); }
    spn.SetOnChange = function( callback ) { spn.onChangeCallback = callback; }
    spn.SetText = function( txt ) { spnSelect.val(txt).selectmenu('refresh'); }   
    spn.SelectItem = function( item ) { spnSelect.val(txt).selectmenu('refresh'); }   
    spn.GetText = function() { return spnSelect.val(); } 
    spn.SetTextColor = function( clr ) { console.log("SetTextColor not implemented"); }    
    spn.SetTextSize = function( size,mode ) { console.log("SetTextSize not implemented"); }   
    spn.GetTextSize = function( mode ) { console.log("GetTextSize not implemented"); return 0; }  
    spn.SetList = function( list,delim ) { setList(list, delim ? delim : ","); }

	return spn;
}

function JQueryMobile_Lst(list, width, height, options)
{
	//Get options.
	options = options ? options.toLowerCase() : "";
	
	//Deal with cards.
	var useCards = options.indexOf("cards")>-1;
	var cards2 = options.indexOf("cards2")>-1;
	var cards2x3 = options.indexOf("cards:2x3")>-1;
    var menu = options.indexOf("menu")>-1;
	var horiz = options.indexOf("horiz")>-1;
	var w=250, h=187;
	if( cards2 ) { w=350; h=262; } else if( cards2x3 ) { w=200; h=300; } 
	
	//Set theme.
	var theme = ""; var backCol = null;
	if( options.indexOf("theme") > -1) theme = (options.indexOf("theme-a")>-1 ? "data-theme=a" : "data-theme=b" );
	var lst = $("<ul data-role=\"listview\" "+theme+" data-inset=\"false\" class='scrollable'>");
	
	//Init base object and set size.
	_initObj(lst);
	lst.attr("id", "lst" + (++_jqmId));
	_setSize(lst, width, height, options);
	
	var listItems = [];
	
	function setList(list, delim)
	{
		lst.list = list;
		lst.empty();

		var items = Array.isArray(list) ? list : list.split(delim);
		for(var i = 0; i < items.length; ++i)
		{
			var itemData = { title: "", body: "", icon: "", data: null };

			var components = items[i].split(":");
			itemData.title = components[0].replace( /\^c\^/g, ":");
            
            
			if(components.length > 3 && components[3].indexOf('|') > -1 ) // Transitional API
			{
                _transitionalAPI=true;
				itemData.body = components[1].replace(/\^c\^/g, ":");
				itemData.icon = (components[2] !== "null") ? components[2] : "";
				itemData.data = components[3].replace(/\^c\^/g, ":");
			}
			else if(components.length > 3 )
			{
				itemData.body = (components[1]+'<br />\n'+components[2]).replace(/\^c\^/g, ":"); // Two-line list items
				itemData.icon = (components[3] !== "null") ? components[3] : "";
            }            
			else if(components.length === 3)
			{
				itemData.body = components[1].replace(/\^c\^/g, ":"); // Single-line list items
				itemData.icon = (components[2] !== "null") ? components[2] : "";
			}
			else if(components.length === 2)
			{
				itemData.icon = (components[1] !== "null") ? components[1] : "";
			}
			
			var item, itemContent, itemIcon;
			item = $("<li data-icon=\"false\" "+(useCards?"style='float:left;background-color:rgba(0,0,0,0)'":"")+">");
			listItems.push( item );

			if(itemData.icon !== "") 
			{
				if( options.indexOf("cards")>-1 )
				{
					itemContent = $("<div href=\"#\" class=\"card"+(cards2?"2":"")+" horizontal-child\">");
					var imgCard = $("<div class=\"card-image\">" );
					itemContent.append( imgCard );
					//imgCard.append( "<img src=\"./Img/image.jpg\"/>" );
					
					imgCard.append( "<img src=\""+ itemData.icon.replace(/\|/g,":") +"\" width='"+w+"px' height='"+h+"px'/>" );
					if( cards2 ) imgCard.append( "<h2>"+itemData.title+"</h2>" );
				}
				else
				{
					//itemContent = $("<a href=\"#\" class=\"ui-btn ui-btn-icon-left ui-icon-" + itemData.icon + "\">");
					itemContent = $("<a href=\"#\" class=\"ui-btn\">");
					itemIcon = $("<i class='lst-icon fa "+itemData.icon+"'></i>");
					itemIcon.css( "text-shadow", "0px 0.1px 1px black" );
					itemContent.append( itemIcon );
					//itemContent = $("<a href=\"#\" class=\"ui-btn\"> <i class='xxx' style='display:inline-block; width:80px; height:80px; background-size: 80px 60px;'></i>");
					//itemContent = $("<a href=\"#\" class=\"ui-btn\"> <i class='fa fa-book'></i>");
				}
			}
			else
				itemContent = $("<a href=\"#\" xclass=\"ui-nodisc-icon\">");

// 			item.append(itemContent); BELOW NOW
			
            
			if( options.indexOf("cards")>-1 ) {
				if( !cards2 ) itemContent.append("<h1 style='width:"+(w-20)+"px'>" + itemData.title + "</h1>");
			}
			else { 
				var title = $("<h2 class='horizontal-child-vcenter' style='text-align:left'>" + itemData.title + "</h2>");
				title.css( "text-shadow", "0px 0px 0px black" );
				itemContent.append( title );
                if(!menu) { itemContent.append($("<br />")); }
			}
			
			if(itemData.body !== "" && !cards2 ) {
				var content =  $( (horiz?"<font>":"<p>") + itemData.body + (horiz?"</font>":"</p>") );
				content.css( "text-shadow", "0px 0px 0px black" );
				content.css( "margin", "0em 0em 0em 1em" );
				content.addClass( "horizontal-child-vcenter" );
				itemContent.append( content );
			}

			item.append(itemContent);
			
			item.data("itemData", itemData);
			item.click(function() 
			{ 
				//if( backCol==null ) backCol = lst.find("a").css( "background-color" );
				//lst.find("a").css( "background-color", backCol );
				//$(this).find("a").css( "background-color", "#f4f4f4" );
				selectItem( $(this) );
				
				if(lst.onTouchCallback) 
				{ 
					var itemData = $(this).data("itemData");
                    if(_transitionalAPI) {
                        lst.onTouchCallback( itemData.title, itemData.body, $(this).index(), itemData.data ); 
                    }
                    else {
                        lst.onTouchCallback( itemData.title, itemData.body, itemData.icon, $(this).index(), itemData.data ); 
                    }
				} 
			});

			// Long Touch
			item.bind("taphold", function() { 
				if(lst.onLongTouchCallback) 
				{ 
					var itemData = $(this).data("itemData");
                    if(_transitionalAPI) {
                        lst.onLongTouchCallback(itemData.title, itemData.body, $(this).index()); 
                    }
                    else {
                        lst.onLongTouchCallback(itemData.title, itemData.body, itemData.icon, $(this).index()); 
                    }
				}
			});

			lst.append(item);
		}

		lst.listview( "refresh" );
	}

	lst.listview();
    
    lst.attr("id", "lst" + (++_jqmId));

	setList(list, ",");

	function selectItem( item )
	{
		if( backCol==null ) backCol = lst.find("a").css( "background-color" );
		lst.find("a").css( "background-color", backCol );
		item.find("a").css( "background-color", "#f4f4f4" );
	}
	
	lst.SetList = function( list,delim ) { setList(list, delim ? delim : ","); }
    lst.GetList = function( delim ) { return lst.list.split(delim); }
    lst.AddItem = function( title,body,image ) { console.log("AddItem not implemented"); }
    lst.InsertItem = function( index,title,body,image ) { console.log("InsertItem not implemented"); }
    lst.SetItem = function( title,newTitle,newBody,newImage ) { console.log("SetItem not implemented"); }
    lst.SetItemByIndex = function( index,newTitle,newBody,newImage ) { 
        console.log("SetItemByIndex not implemented"); 
    }
    lst.RemoveItem = function( title ) { console.log("RemoveItem not implemented"); }
    lst.RemoveItemByIndex = function( index ) { console.log("RemoveItemByIndex not implemented"); }
    lst.RemoveAll = function() { console.log("RemoveAll not implemented"); }
    lst.SelectItem = function( title,body,scroll ) { console.log("SelectItem not implemented");  }
    lst.SelectItemByIndex = function( index,scroll ) { selectItem( listItems[index] ); }
    lst.GetItem = function( title ) {console.log("GetItem not implemented"); return null; }
    lst.GetItemByIndex = function( index ) { console.log("GetItemByIndex not implemented"); return null; }
    lst.GetLength = function() { console.log("GetLength not implemented"); return 0; }
    lst.ScrollToItem = function( title,body ) { console.log("ScrollToItem not implemented"); }
    lst.ScrollToItemByIndex = function( index ) { console.log("ScrollToItemByIndex not implemented"); }
    
   	lst.SetOnTouch = function( callback ) { this.onTouchCallback = callback; lst.click(callback); }
    lst.SetOnLongTouch = function( callback ) { this.onLongTouchCallback = callback; }    
	lst.SetBackColor = function( clr ) { backCol = clr; if( useCards ) lst.css( "background-color", clr ); else lst.children().children().css( "background-color", clr );} 
    lst.SetTextColor1 = function( clr ) { lst.children().children().children().css( "color", clr ); } 
    lst.SetTextColor2 = function( clr ) { lst.find("i").css( "color", clr ); } 
    lst.SetHiTextColor1 = function( clr ) { console.log("SetHiTextColor1 not implemented"); }
    lst.SetHiTextColor2 = function( clr ) { console.log("SetHiTextColor2 not implemented"); } 
    lst.SetTextSize1 = function( size,mode )  { lst.children().children().css( "font-size", size+mode ); } 
    lst.SetTextSize2 = function( size,mode ) { console.log("SetTextSize2 not implemented"); }   
    lst.GetTextSize = function( mode ) { console.log("GetTextSize not implemented"); return 0; }   
    lst.SetTextMargins = function( left,top,right,bottom ) { console.log("SetTextMargins not implemented"); }
    lst.SetEllipsize1 = function( mode ) { console.log("SetEllipsize1 not implemented"); }
    lst.SetEllipsize2 = function( mode ) { console.log("SetEllipsize2 not implemented"); }
    lst.SetTextShadow1 = function( radius,dx,dy,color ) { lst.children().children().children().css( "text-shadow", dx+"px "+dy+"px "+radius+"px "+color ); } 
    lst.SetTextShadow2 = function( radius,dx,dy,color ) { console.log("SetTextShadow2 not implemented"); }
    lst.SetDivider = function( height,clr ) { lst.children().children().css( "border-color", clr ); }
    lst.SetFontFile = function( file ) { console.log("SetFontFile not implemented"); }  
	lst.SetIconSize = function( size,mode ) { lst.find("i").css( "font-size", size+(mode?mode:"") ); } 
	lst.SetColumnWidths = function( w1,w2,w3 ) { console.log("SetColumnWidths not implemented"); }

	return lst;
}

function JQueryMobile_Pnl(options)
{
	var dataPosition = "left";
	var dataDisplay = "overlay";

	options = options ? options.toLowerCase() : "";

	if(options.indexOf("right") >= 0)
		dataPosition = "right";

	// Display options
	if(options.indexOf("reveal") >= 0)
		dataDisplay = "reveal";
	else if(options.indexOf("push") >= 0)
		dataDisplay = "push";

	var panel = $("<div data-role=\"panel\" class=\"ui-panel ui-panel-animate ui-panel-closed\" ></div>");
	_initSObj(panel);

	panel.attr("id", "panel" + (++_jqmId));
	panel.attr("data-position", dataPosition);
	panel.attr("data-display", dataDisplay);
	if( options.indexOf("theme")<0 ) { panel.attr("data-theme", "none"); panel.addClass("ds-ui-panel"); }

	var innerPanel = $("<div class=\"ui-panel-inner no-padding\" ></div>");
	panel.append(innerPanel);
	
	
	panel.Show = function(animate) {
		animate = (typeof animate !== 'undefined') ? animate : true;

		panel.panel("option", "animate", animate);
		panel.panel("open", { immediate: !animate });
		panel.panel("option", "animate", true);
		
		//Trigger redraw of child controls.
		setTimeout( function() { $(window).trigger('resize'); }, 500 );
	};

	panel.Hide = function(animate) {
		animate = (typeof animate !== 'undefined') ? animate : true;

		panel.panel("option", "animate", animate);
		panel.panel("close");
		panel.panel("option", "animate", true);
		
		//Trigger redraw of child controls.
		setTimeout( function() { $(window).trigger('resize'); }, 500 );
	};

	panel.Toggle = function(animate) {
		animate = (typeof animate !== 'undefined') ? animate : true;

		panel.panel("option", "animate", animate);
		panel.panel("toggle");
		panel.panel("option", "animate", true);
		
		//Trigger redraw of child controls.
		setTimeout( function() { $(window).trigger('resize'); }, 500 );
	};

	panel.AddLayout = function(lay) {
		innerPanel.append(lay);
		panel.trigger("updatelayout");
	};
	
	panel.SetBackColor = function( clr ) { panel.css("background-color", clr); }  

	return panel;
}

function JQueryMobile_Bar(title, buttons)
{
	var actionBar = $("<div data-role=\"header\" data-position=\"fixed\">");
	var mainTitle = $("<h1>" + title + "</h1>");
	//mainTitle.css( {width:"10%" });
	actionBar.append( mainTitle );
	
	//Add optional button.
	var btn1 = $("<a href='#' data-role='button' style='left:5em; font-size:17; visibility:hidden;'><i class='fa fa-globe'></i></a>");
	btn1._toggled = false;
	//btn1.button( "option", "disabled", true );
	actionBar.append( btn1 );
		
	var txeSearch = $('<div><input type="search" name="search-mini" id="search-mini" value="" data-mini="true"/></div>');
	txeSearch.hide();
	actionBar.append( txeSearch );
	
	//var cboFlags = $('<div class="ds-ui-flags"><select><option style="background-image:url(flags/us.png);">male</option><option style="background-image:url(flags/gb.png);">female</option></select></div>'); 
	//ok: var cboFlags = $('<div class="ds-ui-flags"><select id="flags" tabindex="1" data-role="none"><option value="AU" data-icon="flags/AU.png">AU</option><option value="UK" data-icon="flags/GB.png">UK</option></select></div>'); 
	var cboFlags = $('<div class="ds-ui-flags"><select id="flags" tabindex="1" data-role="none"></select></div>'); 
	cboFlags.hide();
	actionBar.append( cboFlags );
	cboFlags.find("select").append( $('<option value="GB" data-icon="flags/GB.png">UK</option>') ); 
	cboFlags.find("select").append( $('<option value="FR" data-icon="flags/FR.png">FR</option>') ); 
	cboFlags.find("select").append( $('<option value="IT" data-icon="flags/IT.png">IT</option>') ); 
	cboFlags.find("select").append( $('<option value="CH" data-icon="flags/CH.png">CH</option>') );
    
    actionBar.attr("id", "bar" + (++_jqmId));
	
	var leftActionButtons = $("<div class=\"ui-btn-left\">");
	var rightActionButtons = $("<div class=\"ui-btn-right\">");

	var buttonList = buttons ? buttons.split(",") : [];
	for(var i = 0; i < buttonList.length; ++i)
	{
		var iconAndPosition = buttonList[i].split(":");

		var button = $("<a href=\"#\" class=\"ui-btn ui-btn-icon-notext ui-corner-all\"></a>");
		button.addClass("ui-icon-" + iconAndPosition[0].replace(/\[|\]|/gi, ""));

		button.data("itemData", iconAndPosition[0]);

		button.click(function() { 
			if(actionBar.callback) 
			{ 
				var itemData = $(this).data("itemData");
				actionBar.callback(itemData); 
			} 
		});

		var position = (iconAndPosition.length > 1) ? iconAndPosition[1].toLowerCase() : "l";

		if(position === "l")
		{
			leftActionButtons.append(button);
		}
		else
		{
			rightActionButtons.append(button);
		}
	}

	actionBar.append(leftActionButtons);
	actionBar.append(rightActionButtons);

	actionBar.Show = function() {
		actionBar.toolbar("show");

		// This seems to be required to make sure the page content
		// is resized properly once the header is made visible
		$(window).trigger('resize');
	};

	actionBar.Hide = function() {
		actionBar.toolbar("hide");
	};

   	actionBar.SetOnTouch = function( callback ) { actionBar.callback = callback; actionBar.click(callback); }
	
	actionBar.SetTitle = function( title ) {
		mainTitle.text( title );
	};
	
	actionBar.ShowButton = function( id, callback, tip, options, state ) 
	{
		options = options ? options.toLowerCase() : "";
		if( id==1 ) 
		{ 
			btn1.css( "visibility", "visible");
			//btn1.css( "visibility", show ? "visible" : "hidden" );
			btn1.attr( "title", tip );
			//btn1.addClass('ui-disabled');
			//if( options.indexOf("toggle") ) btn1.addClass('ds-ui-btn-toggled');
			//else btn1.removeClass('ds-ui-btn-toggled');
			if( state ) btn1._toggled = true;
			if( btn1._toggled ) btn1.addClass('ds-ui-btn-toggle-on'); 
			else btn1.addClass('ds-ui-btn-toggle-off'); 
				
			if( !btn1._clickBound ) btn1.click( function() {  
				btn1._clickBound = true;
				if( !btn1._toggled ) { btn1.removeClass('ds-ui-btn-toggle-off'); btn1.addClass('ds-ui-btn-toggle-on'); btn1._toggled=true; }
				else { btn1.removeClass('ds-ui-btn-toggle-on'); btn1.addClass('ds-ui-btn-toggle-off');  btn1._toggled=false; }
				if( callback ) callback( btn1._toggled ); 
			} );
		}
	};
	
	actionBar.HideButton = function( id ) 
	{
		btn1.css( "visibility", "hidden" );
	}
	
	actionBar.ShowSearch = function( callback ) 
	{
		txeSearch.find("input").val("");
		txeSearch.show();
		
		if( !txeSearch._changeBound ) txeSearch.change( function() {  
			txeSearch._changeBound = true;
			if( callback ) callback( txeSearch.find("input").val() ); 
		} );
	}

	actionBar.HideSearch = function() {
		txeSearch.hide();
	}
	
	actionBar.ShowFlags = function( callback ) 
	{
		//cboFlags.find("input").val("");
		cboFlags.show();
		
		if( !cboFlags._changeBound ) cboFlags.change( function() {  
			cboFlags._changeBound = true;
			if( callback ) callback( cboFlags.find("select").val() ); 
		} );
	}

	actionBar.HideFlags = function() {
		cboFlags.hide();
	}
	
	return actionBar;
}

function JQueryMobile_Dlg(title, options)
{
	options = options ? options.toLowerCase() : "";
	var autoCancel = options.indexOf("autocancel")>-1;
	
	var dlg = $("<div data-role=\"popup\" data-overlay-theme=\"a\" data-theme=\"a\" data-dismissible="+(autoCancel?true:false)+">");
	dlg.append("<div data-role=\"header\" data-theme=\"a\" role=\"banner\" class=\"ui-header ui-bar-a\"><h1 class=\"ui-title no-margin\" role=\"heading\" aria-level=\"1\">" + title + "</h1>");

	var dlgContent = $("<div role=\"main\" class=\"ui-content no-padding\">");
	dlg.append(dlgContent);

	_initObj(dlg);
    dlg.attr("id", "dlg" + (++_jqmId));

	dlg.css("min-width", "300px");

   	dlg.SetOnTouch = function( callback ) { dlg.callback = callback; dlg.click(callback); }
    dlg.AddLayout = function( layout ) { dlgContent.append(layout); }	
	dlg.RemoveLayout = function( layout ) { layout.remove(); }	
	dlg.Show = function() { dlg.popup("open"); }
	dlg.Hide = function() { dlg.popup("close"); }
	dlg.Dismiss = function() { dlg.popup("destroy"); dlg.remove(); }
	dlg.SetTitle = function( title ) { dlg.find("div[data-role='header'] h1").text(title); }
	dlg.SetSize = function( width,height,options ) { console.log("SetSize not implemented"); }
	dlg.SetOnCancel = function( callback ) { 
		dlg.onCancel = callback;
		dlg.popup( { afterclose: function(event, ui) { dlg.onCancel(); } } );
	}

	return dlg;
}

function JQueryMobile_LstDlg(title, list, options)
{
	var dlg = $("<div data-role=\"popup\" data-overlay-theme=\"a\" data-theme=\"a\" data-dismissible=\"false\">");
	dlg.append("<div data-role=\"header\" data-theme=\"a\" role=\"banner\" class=\"ui-header ui-bar-a\"><h1 class=\"ui-title no-margin\" role=\"heading\" aria-level=\"1\">" + title + "</h1>");

	var dlgContent = $("<div role=\"main\" class=\"ui-content no-padding\">");
	dlg.append(dlgContent);

	var lstLay = new JQueryMobile_Lay("Horizontal");

    var width=0.8, height=0.8;
	var lst = new JQueryMobile_Lst(list, width, height, options); 
	lstLay.AddChild(lst);

	dlgContent.append(lstLay);

	_initSObj(dlg);
    dlg.attr("id", "ldg" + (++_jqmId));

	dlg.css("min-width", "250px");

    dlg.SetOnTouch = function( callback ) { dlg.callback = callback; lst.SetOnTouch(function(ev) {
        console.log("Touched, ready to hide");
        dlg.Hide();
        callback(ev);
    }
    ); }
	dlg.SetTextColor = function( clr ) { dlg.css("color", clr); } //console.log("SetTextColor not implemented"); } 
	dlg.SetBackColor = function( clr ) { dlg.css("background", clr); } //console.log("SetBackColor not implemented"); } 
	dlg.SetSize = function( width,height,options ) { console.log("SetSize not implemented"); }
    dlg.Show = function() {
        function _reshow() {
            if(window.getComputedStyle(this[0]).visibility === "hidden") {
                var d=new Date();
                if(d.valueOf() - this._firstShow > 10000) {
                    console.log(d+": Dialog still not opened after 10 seconds");
                }
                this.popup("open");
                setTimeout(_reshow.bind(this), 200);
            }
            else {
                _center.call(this, dlg);
                setTimeout(function() { _center.call(this,dlg); }.bind(this),200); // Width seems to be changing dynamically so we need to re-center
            }
        };
        dlg._firstShow=new Date().valueOf();
        dlg[0].style.zIndex=9999; // Bring to front
        _reshow.call(dlg); // Repeatedly try to show until successful
        

        //console.log("dlg.Show1"); setTimeout(() => { console.log("dlg.Show2"); dlg.popup("open"); },2000); 
        //alert("height="+dlg.css("height")+";width="+dlg.css("width")+",_w="+_w+",_h="+_h+";top="+top+",left="+left);
    }
    dlg.Hide = function() { 
        console.log("dlg.Hide"); 
        dlg.popup("close"); 
        dlg[0].style.zIndex=-1; 
        dlg[0].visibility="hidden";
    }
    
    return dlg;
}

function _center(dlg) {
    //alert("width="+window.getComputedStyle(this[0]).width);
    var width=parseInt(window.getComputedStyle(this[0]).width);
    var height=parseInt(window.getComputedStyle(this[0]).height);
    //var width=parseInt(dlg.css("width"));
    //var height=parseInt(dlg.css("height"));
    var top=(_h-height)/2,left=(_w-width)/2;
    dlg.css({position:"absolute",top:top+"px",left:left+"px"});
}

function JQueryMobile_Ynd( msg )
{
	var dlg = $("<div data-role=\"popup\" data-overlay-theme=\"a\" data-theme=\"a\" data-dismissible=\"false\">");
	dlg.append("<div data-role=\"header\" data-theme=\"a\" role=\"banner\" class=\"ui-header ui-bar-a\"><h1 class=\"ui-title no-margin\" role=\"heading\" aria-level=\"1\">" + msg + "</h1>");

	var dlgContent = $("<div role=\"main\" class=\"ui-content no-padding\">");
	dlg.append(dlgContent);

	var btnLay = new JQueryMobile_Lay("Horizontal");

	var btnYes = new JQueryMobile_Btn("Yes", 0.02);
	btnYes.SetMargins(0.01, 0.01, 0.005, 0.01);
	btnYes.SetOnClick(function() { 
		if(dlg.callback) dlg.callback("Yes"); 
		dlg.popup("destroy"); 
		dlg.remove();
	});
	btnLay.AddChild(btnYes);

	var btnNo = new JQueryMobile_Btn("No", 0.02);
	btnNo.SetMargins(0.005, 0.01, 0.01, 0.01);
	btnNo.SetOnClick(function() { 
		if(dlg.callback) dlg.callback("No");
		dlg.popup("destroy"); 
		dlg.remove();
	});
	btnLay.AddChild(btnNo);

	dlgContent.append(btnLay);

	_initSObj(dlg);
    ynd.attr("id", "ynd" + (++_jqmId));

	dlg.css("min-width", "250px");

   	dlg.SetOnTouch = function( callback ) { dlg.callback = callback; dlg.click(callback); }
	dlg.SetBackColor = function( clr ) { console.log("SetBackColor not implemented"); } 
	dlg.SetSize = function( width,height,options ) { console.log("SetSize not implemented"); }
    
    return dlg;
}

function JQueryMobile_Map(key, width, height, options)
{
	options = options ? options.toLowerCase() : "";
	var id = "map" + (++_jqmId);

	var map = $("<div>");
	map.attr("id", id);
	_initObj(map);
	map.attr("id", "map" + (++_jqmId));
	_setSize(map, width, height, options);

	// if(width && width > -1)
	// {
	// 	map.css("width", (width * _w) + "px");
	// }

	// if(height && height > -1)
	// {
	// 	map.css("height", (height * _h) + "px");
	// }

	var initMapFunc = "init"+id;

	window[initMapFunc] = function() 
	{
		gmap = new google.maps.Map(document.getElementById(id), gmapOptions);

		for(var i = 0; i < gmapMarkers.length; ++i)
		{
			var marker = new google.maps.Marker(gmapMarkers[i]);
			marker.setMap(gmap);
			marker.addListener("click", function() { onClickMarker(this); });
		}

		if(gmapSearchTxe)
		{
			map.SetSearchTextEdit(gmapSearchTxe);
		}
	}

	var gmap = null;
	var gmapMarkers = [];
	var gmapOptions = {
		center: { lat: -34.397, lng: 150.644 },
  		zoom: 8,
  		zoomControl: true,
  		mapTypeControl: false,
  		scaleControl: true,
  		streetViewControl: false,
  		rotateControl: false,
  		fullscreenControl: false
	};
	var gmapSearchTxe = null;

	var mapScript = $("<script src='https://maps.googleapis.com/maps/api/js?key=" + key + "&callback=" + initMapFunc + "&libraries=places,geometry' async defer></script>");
	$("head").append(mapScript);
	
	
	function onClickMarker(marker)
	{
		console.log(marker.title + ", " + marker.position.lat() + ", " + marker.position.lng());

		if(map.onTouchMarker)
		{
			map.onTouchMarker(marker.title, marker.id, marker.position.lat(), marker.position.lng());
		}
	}

	map.SetCenter = function(latitude, longitude) 
	{
		gmapOptions.center.lat = latitude;
		gmapOptions.center.lng = longitude;

		if(gmap)
		{
			gmap.setCenter(gmapOptions.center);
		}
	};

	map.GetUserLocation = function( callback )
	{
		var getPosition = function( position ) {
			console.log( "Latitude: " + position.coords.latitude + "Longitude: " + position.coords.longitude ); 
			callback( position );
		}
		
		var getError = function () {
			function showError(error) {
				switch(error.code) 
				{
					case error.PERMISSION_DENIED: alert( "User denied the request for Geolocation." ); break;
					case error.POSITION_UNAVAILABLE: alert(  "Location information is unavailable." ); break;
					case error.TIMEOUT: alert( "The request to get user location timed out." ); break;
					case error.UNKNOWN_ERROR: alert(  "An unknown error occurred getting location information." ); break;
				}
			}
		}
		
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition( getPosition, getError );
		} else {
			alert( "Geolocation is not supported by this browser." );
		}
	}
	
	map.SetZoom = function(zoom) 
	{
		gmapOptions.zoom = zoom;

		if(gmap)
		{
			gmap.setZoom(gmapOptions.zoom);
		}
	};

	map.AddMarker = function(title, id, latitude, longitude, options) 
	{
		var markerOptions = {
			position: { lat: latitude, lng: longitude },
			title: title, id : id,
			icon: { url: "http://www.google.com/intl/en_us/mapfiles/ms/micons/red-dot.png", scaledSize: { width: 40, height: 40 } }
		};

		options = options ? options.toLowerCase() : "";

		if(options.indexOf("green") > -1)
		{
			markerOptions.icon.url = "http://www.google.com/intl/en_us/mapfiles/ms/micons/green-dot.png";
		}
		else if(options.indexOf("blue") > -1)
		{
			markerOptions.icon.url = "http://www.google.com/intl/en_us/mapfiles/ms/micons/blue-dot.png";
		}
		else if(options.indexOf("yellow") > -1)
		{
			markerOptions.icon.url = "http://www.google.com/intl/en_us/mapfiles/ms/micons/yellow-dot.png";
		}

		if(gmap)
		{
			var marker = new google.maps.Marker(markerOptions);
			marker.setMap(gmap);
			marker.addListener("click", function() { onClickMarker(this); });
		}
		else
		{
			gmapMarkers.push(markerOptions);
		}
	};

	map.SetOnTouchMarker = function(callback) {
        console.log("map.SetOnTouchMarker not implemented");
		map.onTouchMarker = callback;
	};

	map.DrawPoly = function( points, strokeColor, fillColor, strokeOpacity, fillOpacity, strokeWeight )
	{
        var poly = new google.maps.Polygon({
          paths: points,
          strokeColor: strokeColor,
          strokeOpacity: strokeOpacity,
          strokeWeight: strokeWeight,
          fillColor: fillColor,
          fillOpacity: fillOpacity
        });
        poly.setMap( gmap );
	}
	
	map.IsLocationVisible = function( lat, lng )
	{
		//console.log( "IsLocationVisible:" + lat + " " + lng  )
		
		var point = new google.maps.LatLng(parseFloat(lat),parseFloat(lng));
		//console.log( "point:" + point );
		var currentBounds = gmap.getBounds();
		//console.log( "currentBounds:" + currentBounds + " -> " + currentBounds.contains(point) );
		return currentBounds.contains(point);
		
	/*
		//Get map view port lat long.
		var lat0 = gmap.getBounds().getNorthEast().lat();
		var lng0 = gmap.getBounds().getNorthEast().lng();
		var lat1 = gmap.getBounds().getSouthWest().lat();
		var lng1 = gmap.getBounds().getSouthWest().lng();

		//Make polygon.
		var coords = [ {lat: lat0, lng: lng0}, {lat: lat0, lng: lng1},
		  {lat: lat1, lng: lng1}, {lat: lat1, lng: lng0}
        ];

		//Check point is in viewport.
		var point = new google.maps.LatLng( lat, lng );
        var poly = new google.maps.Polygon( {paths: coords} );
		var ret = google.maps.geometry.poly.containsLocation( point, poly );
		alert( ret );
		return ret;
		*/
	}
	
	map.SetSearchTextEdit = function(txe) 
	{
		if(gmap)
		{
			var input = txe.find("input");
        	var searchBox = new google.maps.places.SearchBox(input.get());
        	//gmap.controls[google.maps.ControlPosition.TOP_LEFT].push(input.get());
        }
        else
        {
        	gmapSearchTxe = txe;
        }
	};
	
	if( options.indexOf("locate")>-1 )
	{
		map.GetUserLocation( function( position ) { map.SetCenter( position.coords.latitude, position.coords.longitude ); } );
	}

	return map;
}

function JQueryMobile_Service(packageName, className, options, callback)
{
    this.packageName=packageName;
    this.className=className;
    this.onMessage=function() { };
    if(!callback) { this.onReady=options?options:function() {}; this.options=""; }
    else { this.options=options; this.onReady=callback; }
	this.SetOnMessage = function(obj, callback) { this.onMessage=callback; }
	this.SendMsg = function(obj, msg) {
        if(!msg) { msg=null; }
        else if(typeof msg === 'string') { msg=JSON.stringify(msg); } //'"'+msg+'"'; } // Old method failed with double quotes
        client.send('{"type":"cmd", "cmd":"SendService", "id":'+obj.id+', "msg":'+msg+'}'); // msg is already stringified
    };
	this.Stop = function(obj) {
        client.send(JSON.stringify({"type":"cmd", "cmd":"StopService", "id":obj.id}));
    };
    this.Send = function(obj,cmd, parms) { 
        client.send(JSON.stringify({"type":"cmd", "cmd":"SendService", "id":obj.id, "cmd2":cmd, "parms":parms}));
	};
	this.SendImg = function(obj,cmd,img ) { 
        client.send(JSON.stringify({"type":"cmd", "cmd":"SendService", "id":obj.id, "cmd2":cmd, "img":img}));
    };
    this.Start = function(obj) {    
        client.send(JSON.stringify({"type":"cmd", "cmd":"StartService", "id":obj.id, "packageName":this.packageName, "className":this.className, "options":this.options}));
    }
    _currentService=this;
}

function _initObj(element)
{
	element.Destroy = function() { this.remove(); } 
    element.Release = function() { this.remove(); }        
    element.SetVisibility = function( mode ) { if(mode.toLowerCase().indexOf("show")>-1) this.show(); else this.hide(); }    
    // FIXME: dialog show() not working:
    // FIXME: display â†’ "inline-block", "text-align" â†’ "center", "white-space" â†’ "nowrap", "overflow-x" â†’ "hidden", "overflow-y" â†’ "hidden", width â†’ "40vw", height â†’ "72vh", "background-color" â†’ "rgb(221, 238, 255)", left â†’ "2.5vw", top â†’ "2vh", â€¦ 
    element.GetVisibility = function() { return this.is(":visible"); }   
    element.SetPadding = function( left,top,right,bottom ) { this.css("padding", _toViewportHeight(top) + " " + _toViewportWidth(right) + " " + _toViewportHeight(bottom) + " " + _toViewportWidth(left)); }
    element.SetMargins = function( left,top,right,bottom ) { this.css("margin", _toViewportHeight(top) + " " + _toViewportWidth(right) + " " + _toViewportHeight(bottom) + " " + _toViewportWidth(left)); }
    element.SetBackground = function( file,options ) { 
        if(!options) options="";
		this.css("background-image", "url("+file+")"); 
		if(options.indexOf("repeat")==-1) this.css("background-size", "100% 100%" ); 
		else this.css("background-repeat","repeat"); 
	}
    element.SetBackColor = function( clr ) { this.css("background-color", _fixColor(clr)); }  
    element.SetBackGradient = function( colour1,colour2,colour3,options ) { 
        //console.log( "SetBackGradient not implemented" ); 
        var dir="to bottom, ";
        if(options) {
            if(options == "bottom-top") { dir="to top, "; }
            else if(options == "top-bottom") { dir="to bottom, "; }
            else if(options == "left-right") { dir="to right, "; }
            else if(options == "right-left") { dir="to left, "; }
        }
        var gr="linear-gradient("+dir+_fixColor(colour1)+","+_fixColor(colour2)+(colour3?","+_fixColor(colour3):"")+")";
        this.css("background", gr);
    }
    element.SetBackGradientRadial = function( x,y,radius,colour1,colour2,colour3,options ) {
        console.log( "SetBackGradientRadial radius,options ignored" ); 
        if(typeof y === 'number') this.css("height", y);
        if(typeof x === 'number') this.css("width", x);
        this.css("background", "radial-gradient("+colour1+","+colour2+(colour3?","+colour3:"")+")");
    }
    element.SetPosition = function( left,top,width,height,options ) { 
        /*
         * function getPosition( element ) {
                var rect = element.getBoundingClientRect();
                return {x:rect.left,y:rect.top};
                }

                works in all browsers :) .. use it like this

                var el = document.getElementById( 'myElement' );
                var pos = getPosition( el );
                alert( pos.x ); alert( pos.y );
                
------------------------------------------


                The correct approach is to use element.getBoundingClientRect():

                var rect = element.getBoundingClientRect();
                console.log(rect.top, rect.right, rect.bottom, rect.left);

                Internet Explorer has supported this since as long as you are likely to care about and it was finally standardized in CSSOM Views. All other browsers adopted it a long time ago.

                Some browsers also return height and width properties, though this is non-standard. If you're worried about older browser compatibility, check this answer's revisions for an optimised degrading implementation.

                The values returned by element.getBoundingClientRect() are relative to the viewport. If you need it relative to another element, simply subtract one rectangle from the other:

                var bodyRect = document.body.getBoundingClientRect(),
                    elemRect = element.getBoundingClientRect(),
                    offset   = elemRect.top - bodyRect.top;

                alert('Element is ' + offset + ' vertical pixels from <body>');
--------------------------------------------
                function getOffset(el) {
                const rect = el.getBoundingClientRect();
                return {
                    left: rect.left + window.scrollX,
                    top: rect.top + window.scrollY
                };
                }

                Using this we can call

                getOffset(element).left

                or

                getOffset(element).top

         * */
        
        this.css("position", "absolute");
        _SetPosition(this[0], left,top,width,height);
    }
    element.SetSize = function( width,height,options ) { _setSize(this, width, height,options); }
    element.GetWidth = function( options ) { return this.width(); }  
    element.GetHeight = function( options ) { return this.height(); }   
    element.GetAbsWidth = function() { return this.width(); }  
    element.GetAbsHeight = function() { return this.height(); }   
    element.GetLeft = function( options ) { return this.position().left; }  
    element.GetTop = function( options ) { return this.position().top; }   
    element.GetPosition = function( options ) { return this.position(); } 
    element.SetScale = function( x,y ) { 
        //console.log( "SetScale not implemented" ); 
        this.css("transform", "scale("+x+", "+y+")");
    }
    element.Focus = function() { this.focus(); }
	
	element._Redraw = function() { _redraw( this ); } 
}

function _SetPosition(hElem,left,top,width,height) { // Set fractional (0 to 1) position/size on HTML element
    var par=hElem.parentElement;
    var px=par?par.offsetLeft/_w:0;
    var py=par?par.offsetTop/_h:0; 
    // NOTE: If any ancestor is a scroller, then position relative to top, not to parent offset
    //console.log("el="+hElem.id+" POSITIONING to x="+left+",y="+top);
    for(var el=hElem; el && el.id.indexOf('scr') !== 0; el=el.parentElement) { 
        if(hElem.id == "lay29") { console.log("el="+(el?el.id:"(null)")+" FINDING PARENT for POS"); }
    }
    if(px>0 || py>0) { console.log("POS el="+(el?el.id:"(null)")+";px="+px+";py="+py+"\n"); }
    if(el) { px=py=0; } // If ancestor was a scroller, position from top
    if(typeof left === 'number')   hElem.style.left   =((px+left)*100)+"vw";
    if(typeof top === 'number')    { hElem.style.top    =((py+top) *100)+"vh"; console.log("POS top="+hElem.style.top); }
    if(typeof height === 'number') hElem.style.height =(height   *100)+"vh";
    if(typeof width === 'number')  hElem.style.width  =(width    *100)+"vw";
}

function _fixColor(clr) {
    clr=clr?clr.toLowerCase():"black";
    if(clr == "green") { clr="#0F0"; }
    return _RGBA(clr);
}

function _RGBA(hexARGB) {
    if(!hexARGB) { return 'black'; }
    if(hexARGB[0] !== '#' || hexARGB.length < 9) { return hexARGB; }
    var A=(parseInt(hexARGB.substring(1,3),16)/255).toFixed(2);
    return 'rgba('+parseInt(hexARGB.substring(3,5),16)+','+
        parseInt(hexARGB.substring(5,7),16)+','+
        parseInt(hexARGB.substring(7,9),16)+','+A+')';
}

function _initSObj(element)
{
	element.Destroy = function() { this.remove(); } 
    element.Release = function() { this.remove(); }
}

function _toPixelWidth(fraction)
{
	return Math.round(fraction * _w) + "px";
}

function _toPixelHeight(fraction)
{
	return Math.round(fraction * _h) + "px";
}

function _toViewportWidth(fraction) {
    return (fraction * 100) + "vw";
}

function _toViewportHeight(fraction) {
    return (fraction * 100) + "vh";
}

function _setSize(element, width, height, options)
{
	//console.log( "_setSize " + width + " " + height + " " + options );
	//console.log( "_id "+ element._id + " width: " + width );
	
	//Store settings for use in _resize func. 
	element._width = width ? width : -1;
	element._height = height ? height : -1;
	element._options = options;
	
	options = options ? options.toLowerCase() : "";
	
	element._flow = (options.indexOf("flow") > -1);
	if( element._flow ) element.css( "float", "left" );
	
	if( options.indexOf("fillx")>-1 || options.indexOf("fillxy")>-1 ) 
		element.css("width", "100%");
		//element.css("width", element.parent.width );
	
	if( options.indexOf("filly")>-1 || options.indexOf("fillxy")>-1 ) 
		element.css("height", "100%");
		//element.css("height", element.parent.height );
		
    var fact=1;
    var id=element.attr?element.attr("id"):"";
    var isImg=false,isTxt=false;
    if(id && id.indexOf('btn') == 0) { fact=0.99; }
    if(id && id.indexOf('img') == 0) { isImg=true; }
    if(id && id.indexOf('txt') == 0) { isTxt=true; }
	if(width && width > -1 ) {
        var pw=isImg ? _toPixelWidth(width) : _toViewportWidth(width*fact);
		element.css("width", pw);
        element[0].width=isImg ? parseInt(pw) : pw;
	}

	if(height && height > -1 ) {
        var ph=isImg ? _toPixelHeight(height) : _toViewportHeight(height*fact);
		element.css("height", ph);
        element[0].height=isImg ? parseInt(ph) : ph;
        if(fact < 1 || isTxt) { element.css("line-height", ph); }
    }
    //if(height < -1) { throw new Error("Invalid height="+height+"; id="+element.attr("id")); }
}

function _redraw( element )
{
	//if( element.attr('id')=="img" )
	if( !element._flow ) 
	{
		//Reset max dimensions if using panel/drawer.
		if( $("#contentMain") ) 
		{
			var w = $("#contentMain").width();
			var h = $("#contentMain").height();
			_w = w ? w : _w;
			_h =  h ? h : _h;
		}
			
		 //console.log( "img element._width: " + element._width + " css" + element.css("width")  )
		//if( element._width ) console.log("_redraw " + element._width + " element.id : " + element.attr('id') );
		//if(  element._id == "fred" ) {
		//	 console.log( "img element._width: " + element._width )
			_setSize( element, element._width, element._height, element._options );
		//}
	}
}

function _onResize() {
    if(typeof $ === 'function') {
        _redraw(window);
//         _h = $(window).height();
//         _w = $(window).width();
        if(typeof OnConfig === 'function') { OnConfig(); }
    }
    else { console.log("UI not loaded yet.  Resize ignored."); }
}

function _initWebSock() {
    var host=window.location.hostname;
    var port=window.location.port;
    //host='192.168.201.1';
    //port=81;
    if(port == 8444) { port = 8082; } // FIXME
    //var proto='ws://';
    //if(port == 8444) { proto='wss://'; } // FIXME: WE can't handle sockets over SSL.  But newer browsers won't handle mixed content (non-SSL socket from SSL page)
    var wsurl='ws://'+host+':'+port+window.location.pathname;
    console.log('CON '+wsurl);
    var proto='droidscript-sync';
    client = null;
    
    try { client=new WebSocket(wsurl, proto); }
    catch(e) { return null; }

    client.onerror = function() {
        console.log('Connection Error');
    };
    
    client.onopen = function() {
        console.log('CON open');
        if(!_started) { _initApp(); }

        
        _loadProgress(97+': WebSocket Connected', 'Synchronizing...');
        if (client.readyState === client.OPEN) {
        }
    };
    
    client.onclose = function() {
        console.log('droidscript-sync Client Closed');
        //if(!otherSession) {
            setTimeout(function() { // Run in UI handler
                if(confirm('Connection to server lost.  Reconnect?')) {
                    setTimeout('_initWebSock();',5000);
                }
            },0);
        //}
    };
    /*  Example MessageEvent {
            currentTarget: WebSocket {
                binaryType: "blob",
                protocol: "droidscript-syn",
                readyState: 1,
                url: "ws://192.168.201.1:81/app/AppName/",
                ...
            },
            data: Blob {
                size: 26105,
                type: ""
            },
            origin: "ws://192.168.201.1:81", 
            srcElement: WebSocket,
            target: WebSocket,
            timeStamp: 26309.395,
            ...
        }     
    */
    
    client.onmessage = function(e) {
        //if(firstCall) { firstCall=false; init(); }
        //console.log('message received');
        if (typeof e.data === 'string') {
            //alert('data='+e.data);
            //console.log('data='+e.data);
            var msg=JSON.parse(e.data);
            if(msg.type == "sync") {
                if(!_started) {
                    window.appLoaded=true;
                    if(window.appCached) { _initApp(); }
                }
            }
            else if(msg.type == "syncdone" || msg.type == "syncerr") { 
                if(msg.type == "syncerr") {
                    console.log("SERVER ERROR: "+msg.err); 
                    client.send(JSON.stringify({"type":"sync"})); // Continue sync from server
                }
console.log("Sync Done.  init?");
                if(!_started) { _initApp(); }
            }
            else if(msg.type == "service") {
                console.log("SERVICE "+msg.service);
            }
            else if(msg.type == "cmd") { // "_DroidScript_Fn":"SendMessage", "data":msg
                var fn=msg.data._DroidScript_Fn;
                var d=msg.data.data;
                //console.log("fn="+fn+"; data="+d+"; options="+msg.data.options);
                switch(fn) {
                    case "SendMessage": _currentService.onMessage(d); break;
                    case "ShowPopup":   app.ShowPopup(d, msg.data.options); break;
                    default: console.log("fn="+fn+"; data="+d+"; options="+msg.data.options); break;
                }
            }
            else if(msg.type == "ServiceReady") {
                console.log("ServiceReady: id="+msg.id);
                var fn=__idMap[msg.id].impl.onReady;
                if(typeof fn == 'function') { fn(); }
            }
            else {
                console.log('Received message with type '+msg.type+': '+e.data);
            }
        }
        else {
            console.log('Received data of unknown type '+(typeof e.data)+'; length='+e.length+';elen='+e.data.length+';obj='+JSON.stringify(e.data));  
            window.teste=e;
        }
    };
}

function _initApp() {
    _started=true; 
//console.log('_initApp#1: type:'+(typeof OnStart));
    if(typeof OnStart === 'function') { 
//console.log('_initApp#2');
        _loadProgress(98);
        //OnStart=syncify.revert(OnStart);
        //OnStart( (ret) => { throw ret; } ); //console.log("OnStart="+ret); } );
        var backColor="#111";
        ids=['_pageBody','pageMain','contentMain'];
        for(id in ids) { 
            console.log(ids[id]); 
            document.getElementById(ids[id]).style.backgroundColor=backColor;
        }
        OnStart();
        _loadProgress(99);
//console.log('_initApp#3');
    }
//console.log('_initApp#4');
}

function _Sync(msg) { // Sync with null msg when client file changes (write/metadata)
    console.log("_Sync: path="+msg.path);
    //console.log("path: "+tree.path+" lastModified="+tree.lastModified);
    var ref=_retrieveFile(msg.path);
    if(msg && (!ref || ref.lastModified < msg.lastModified || !ref.data)) { // FIXME: Check for EITHER localStorage data OR Chrome api
        //console.log("_Sync:!ref:"+(!ref)+";<:"+(ref.lastModified < msg.lastModified)+";ref.data:"+(!ref.data));
        if(!msg.data) {
            //var uri= "/app/:*"+msg.path; //msg.path.replace(base,"/app/:*"+base);
            //_fetchBlob(uri, (data, blob) => { _storeFile(msg, data, blob); });
            //_fetchBlob(msg.path, (data, blob) => { _storeFile(msg, data, blob); });
            var blob=new Blob([],{type:msg.type});
            _storeFile(msg, null, blob); 
            _fetchBlobOnly(msg.path, (blob) => { _storeFile(msg, null, blob); });
        }
        else {
            //console.log("msg.path="+msg.path+";msg.data="+msg.data+"***");
            var blob=new Blob([msg.data],{type:'inode/directory'});
            var data=_blobToDataURL(blob);
            _storeFile(msg, data, blob);
        }
    }
    client.send(JSON.stringify({"type":"sync"})); // Continue sync from server
}

function _storeFile(obj, data, blob) { // Input 'data' must be as a data URI or null if not storing data (e.g. for files to get from browser cache)
    // FIXME: Set EITHER localStorage or Chrome data, not both
    console.log("_storeFile: path="+obj.path+"; stack="+new Error().stack);
    var id='FILE:'+obj.path;
    // NOTE: Possibly need to update parent directory (if this was a newly created file)
    var spl=obj.path.split('/');
    var final=spl.slice(-1)[0];
    var ppath=spl.slice(0,-1).join('/');
    if(ppath === '' && obj.path[0] == '/' && obj.path.length > 1) { ppath='/'; } // Even root may need to be updated
    if(ppath !== '') {
        var file=_retrieveFile(ppath);
        if(file && file.type === "inode/directory") {
            //console.log("id="+id+";parent str="+_blobToString(file));
            var filenames=JSON.parse(_blobToString(file));
            if(!filenames.find( (el) => { return el === final; })) { // If directory doesn't have this file yet
                filenames.push(final);
                console.log("Added "+final+" to "+JSON.stringify(filenames));
                _createDirWithFilenames(ppath, filenames);
            }
        }
        else if(!file) { _createDirWithFilenames(ppath, []); } // Create missing parent(s)
        else { console.error("ERROR: Parent of '"+obj.path+"' is type '"+file.type+"'"); }
    }
//console.log("STORING "+id);
    if(obj.path.indexOf('sample3.js') > -1) console.log("STORING "+id);

    try { localStorage[id] = JSON.stringify({path:obj.path, lastModified:obj.lastModified, type:obj.ctype, length:blob.length, data:data}); }
    catch(e) { alert('Local Storage error: '+e.message); }
    var file = _blobToFile(blob, obj.path, obj.lastModified);
    file.data=data;
    _files[id] = file;
}

function _createDirWithFilenames(path, filenames) { // Input array of filenames
    console.log("_createDirWithFilenames: path="+path);
    var ctype="inode/directory";
    var blob=new Blob([JSON.stringify(filenames)],{type:ctype});
    var data=_blobToDataURL(blob);
    var msg={path:path, lastModified:Date.now(), type:blob.type, length:blob.length, data:data};
    _storeFile(msg, data, blob);
}

/*var _fetchFileSync = syncify( (path, done) => {
    var xhr = new XMLHttpRequest(); 
    xhr.open("GET", path); 
    xhr.responseType = "blob"; // force the HTTP response, response-type header to be blob
    xhr.onload = () => {
        var blob=xhr.response;
        var heads=xhr.getAllResponseHeaders().split('\r\n'); //.toLowerCase();
        var headers={};
        for(var xa=0; xa<heads.length; xa++) {
            var head=heads[xa].split(': ');
            if(head == "") { continue; }
            headers[head[0].toLowerCase()] = head[1];
        }
        var lastModified=new Date(headers['date']).getTime();
        var file=_blobToFile(blob, path, lastModified);
        done(blob);
    }
    xhr.send()
});
*/
function _retrieveFolder(path)  {
    var req = new XMLHttpRequest();
    req.open('GET', path, false);
    req.send(null);
    if (req.status != 200) return null;
    var ctype=req.getResponseHeader('content-type');
    if(ctype != 'inode/directory') { return null; }
    return req.responseText;
}

function _retrieveFile(path) {
    var id='FILE:'+path;
    var ref=_files[id];
    if(ref) { return ref; }
        
    ref=localStorage[id];
    if(!ref) { 
        if(path.indexOf('sample3.js') > -1) console.log("FILE "+path+" not found.");
        return null; }
    if(path.indexOf('sample3.js') > -1) { console.log("_retrieveFile: "+path); }
    
    try {
        var obj=JSON.parse(ref);
        var blob=obj.data ? _dataURItoBlob(obj.data) : new Blob([],{type:obj.type});
        var file=_blobToFile(blob, path, obj.lastModified);
        file.data=obj.data;
        _files[id]=file;
        return file;    // NOTE: File contents cannot be taken from this unless it is type: inode/directory
                        // NOTE: Regular files are too large to store as a dataURI in localStorage.  Instead,
                        // NOTE: we must
    }
    catch(e) {
        console.log("ERROR: "+e.stack+"\nref="+ref);
        throw e;
    }
}

function _blobToFile(blob, name, lastModified) {
    if(!lastModified) { lastModified=Date.now(); }
    try { return new File([blob], name, {type:blob.type, lastModified:lastModified}); }
    catch(e) {
        var f=new Blob([blob], {type:blob.type});
        f.name=name;
        f.lastModified=lastModified;
        f.lastModifiedDate=new Date(f.lastModified);
        return f;
    }
}

function _fetchBlob(uri, done) { // Returns a blob as a data url (as well as original blob)
    var xhr = new XMLHttpRequest(); 
    xhr.open("GET", uri); 
    xhr.responseType = "blob"; // force the HTTP response, response-type header to be blob
    xhr.onload = () => {
        var blob = xhr.response;
        var reader = new FileReader();
        reader.onload = ( (self) => {
            return (e) => { done(e.target.result, blob); }
        })(this);
        reader.readAsDataURL(blob);
    }
    xhr.send()
}

function _fetchBlobOnly(uri, done) { // Returns a blob asynchronously
    var xhr = new XMLHttpRequest(); 
    xhr.open("GET", uri); 
    xhr.responseType = "blob"; // force the HTTP response, response-type header to be blob
    xhr.onload = () => {
        var blob = xhr.response;
        done(blob);
    }
    xhr.send()
}

function _dataURItoBlob(dataURI) {
    // convert base64/URLEncoded data component to raw binary data held in a string
    var byteString;
    if (dataURI.split(',')[0].indexOf('base64') >= 0)
        byteString = atob(dataURI.split(',')[1]);
    else
        byteString = unescape(dataURI.split(',')[1]);

    //console.log("dataURI="+dataURI+"***");
    // separate out the mime component
    var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

    // write the bytes of the string to a typed array
    var ia = new Uint8Array(byteString.length);
    for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }

    return new Blob([ia], {type:mimeString});
}

function _blobToDataURL(blob) {
    var u8a=_blobToUint8Array(blob)
    return 'data:'+blob.type+';base64,'+btoa(_Uint8ToString(u8a));
}

function _blobToUint8Array(b) {
    var uri = URL.createObjectURL(b),
        xhr = new XMLHttpRequest(),
        i,
        ui8;

    xhr.open('GET', uri, false);
    // The magic happens below, which overrides the MIME type, forcing the browser to treat it as plain text, 
    // using a user-defined character set. This tells the browser not to parse it, and to let the bytes pass through unprocessed.
    xhr.overrideMimeType('text\/plain; charset=x-user-defined'); // NOTE: Key #1
    xhr.send(null);

    URL.revokeObjectURL(uri); // Avoid resource leak
    if (xhr.status != 200) return [];

    ui8 = new Uint8Array(xhr.responseText.length); // NOTE: was response, not responseText.  Not sure if it matters.

    for (i = 0; i < xhr.responseText.length; ++i) {
        ui8[i] = xhr.responseText.charCodeAt(i) & 0xff; // NOTE: Key #2
    }

    return ui8;
}


function _load_binary_resource(url) {
  var req = new XMLHttpRequest();
  req.open('GET', url, false);
  //XHR binary charset opt by Marcus Granado 2006 [http://mgran.blogspot.com]
  req.overrideMimeType('text\/plain; charset=x-user-defined');
  req.send(null);
  if (req.status != 200) return '';
  //window.req=req;
  //var b=new Blob; // Convert data to blob?
  return req.responseText; // NOTE: Use return: var abyte = _load_binary_resource(url).charCodeAt(x) & 0xff; // throw away high-order byte (f7)
}

function _save_binary_resource(url, data) {
    var xhr = new XMLHttpRequest();
  //req.open('PUT', url, false);
  //XHR binary charset opt by Marcus Granado 2006 [http://mgran.blogspot.com]
  //req.overrideMimeType('text\/plain; charset=x-user-defined');
  //req.send(null);
    xhr.open('PUT', url);
    xhr.responseType = "blob"; // force the HTTP response, response-type header to be blob
    xhr.onload = () => {
        if (xhr.status != 204) {
            console.error("status="+xhr.status+"; retry later");
        }
    }
    var blob=new Blob([data], {type: 'text/plain; charset=x-user-defined'});
    xhr.send(blob);
    return true;
}

// For short input, Decode base64 back to Uint8Array
//var u8_2 = new Uint8Array(atob(b64encoded).split("").map(function(c) {
//    return c.charCodeAt(0); }));
//    OR use below: var b64encoded = btoa(Uint8ToString(u8));
function _Uint8ToString(u8a) {
  var CHUNK_SZ = 0x8000;
  var c = [];
  for (var i=0; i < u8a.length; i+=CHUNK_SZ) {
    c.push(String.fromCharCode.apply(null, u8a.subarray(i, i+CHUNK_SZ)));
  }
  return c.join("");
}

function _asyncBlobToDataURL(blob, callback) {
    var a = new FileReader();
    a.onload = function(e) {callback(e.target.result);}
    a.readAsDataURL(blob);
}

function _blobToString(b) {
    var u, x;
    u = URL.createObjectURL(b);
    x = new XMLHttpRequest();
    x.open('GET', u, false); // although sync, you're not fetching over internet
    x.send();
    URL.revokeObjectURL(u);
    return x.responseText;
}

function _asyncBlobToString(blob, done) {
    var reader = new FileReader();
    reader.onload = function() { done(reader.result); }
    reader.readAsText(blob);   
}

function _init(isDs) {
    _h = $(window).height();
    _w = $(window).width();
    
    if(isDs) { _initWebSock(); }
    // Started in app-init.js // else { _initApp(); }
//     if(dirTree && dirTree != '') {
//         alert('dirTree='+dirTree);
//         dirTree=JSON.parse(dirTree);
//     }
    
//    if(typeof OnStart === 'function') { OnStart(); }
}

////////////////////////////////
// Modified _WebSock by Charles Wilt from 11/2/16 post to DroidScript Google Group
////////////////////////////////
function _WebSock( id, ip, port, options )
{
   var m_OnMessage = null;
   var m_sock = null;
   var m_timer = null;
   
   var m_OnOpen = null;
   var m_OnClose = null;
   var m_IsOpen = null;

   
    console.log( "Opening web socket:" + id );
   if( !port ) port = 8080;
  m_sock = new WebSocket( "ws://"+ip+":"+port );
  m_sock.onopen = OnOpen;
 m_sock.onmessage = OnMessage;
   m_sock.onclose = OnClose;
       m_sock.onerror = OnError;
       m_timer = setInterval( CheckSocket, 7000 );
   
    function OnOpen() {
        console.log( "Socket Open: "+id );
       if (m_OnOpen) m_OnOpen(id);
       m_IsOpen=true;
   }
   
   function CheckSocket() {  
       if( m_sock.readyState != 1 ) {
           console.log( "Re-opening web socket:" + id );
           m_sock = new WebSocket( "ws://"+ip+":"+port );
       }
   }
   
   function OnClose() {
        console.log( "Socket Closed: "+id );
        if (m_OnClose) m_OnClose(id);
       m_IsOpen=false;
   }
   
   function OnError(e) { console.log( "Socket Error: "+e.data ); }
   function OnMessage( msg ) { if( m_OnMessage ) m_OnMessage( msg.data ); }
   
   
 this.Close = function() { m_sock.close(); }
   this.GetSocket = function() { return m_sock; }
   this.SetOnMessage = function( callback ) { m_OnMessage = callback; }
   
   this.SetOnOpen = function( callback ) { m_OnOpen = callback; }
   this.SetOnClose = function( callback ) { m_OnClose = callback; }
   this.IsOpen = function(){return m_IsOpen;}
   
   this.Send = function( msg ) {
       if( m_sock.readyState != 1 ) console.log( "Socket not ready:"+m_sock );
        else m_sock.send( msg );
   }
   return this;
}
function _retrieveFolder(path)  {
    var req = new XMLHttpRequest();
    req.open('GET', path, false);
    req.send(null);
    if (req.status != 200) return null;
    var ctype=req.getResponseHeader('content-type');
    if(ctype != 'inode/directory') { return null; }
    return req.responseText;
}

function _retrieveFile(path) {
    var id='FILE:'+path;
    var ref=_files[id];
    if(ref) { return ref; }
        
    ref=localStorage[id];
    if(!ref) { 
        if(path.indexOf('sample3.js') > -1) console.log("FILE "+path+" not found.");
        return null; }
    if(path.indexOf('sample3.js') > -1) { console.log("_retrieveFile: "+path); }
    
    try {
        var obj=JSON.parse(ref);
        var blob=obj.data ? _dataURItoBlob(obj.data) : new Blob([],{type:obj.type});
        var file=_blobToFile(blob, path, obj.lastModified);
        file.data=obj.data;
        _files[id]=file;
        return file;    // NOTE: File contents cannot be taken from this unless it is type: inode/directory
                        // NOTE: Regular files are too large to store as a dataURI in localStorage.  Instead,
                        // NOTE: we must
    }
    catch(e) {
        console.log("ERROR: "+e.stack+"\nref="+ref);
        throw e;
    }
}

function _blobToFile(blob, name, lastModified) {
    if(!lastModified) { lastModified=Date.now(); }
    try { return new File([blob], name, {type:blob.type, lastModified:lastModified}); }
    catch(e) {
        var f=new Blob([blob], {type:blob.type});
        f.name=name;
        f.lastModified=lastModified;
        f.lastModifiedDate=new Date(f.lastModified);
        return f;
    }
}

function _fetchBlob(uri, done) { // Returns a blob as a data url (as well as original blob)
    var xhr = new XMLHttpRequest(); 
    xhr.open("GET", uri); 
    xhr.responseType = "blob"; // force the HTTP response, response-type header to be blob
    xhr.onload = () => {
        var blob = xhr.response;
        var reader = new FileReader();
        reader.onload = ( (self) => {
            return (e) => { done(e.target.result, blob); }
        })(this);
        reader.readAsDataURL(blob);
    }
    xhr.send()
}

function _fetchBlobOnly(uri, done) { // Returns a blob asynchronously
    var xhr = new XMLHttpRequest(); 
    xhr.open("GET", uri); 
    xhr.responseType = "blob"; // force the HTTP response, response-type header to be blob
    xhr.onload = () => {
        var blob = xhr.response;
        done(blob);
    }
    xhr.send()
}

function _dataURItoBlob(dataURI) {
    // convert base64/URLEncoded data component to raw binary data held in a string
    var byteString;
    if (dataURI.split(',')[0].indexOf('base64') >= 0)
        byteString = atob(dataURI.split(',')[1]);
    else
        byteString = unescape(dataURI.split(',')[1]);

    //console.log("dataURI="+dataURI+"***");
    // separate out the mime component
    var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

    // write the bytes of the string to a typed array
    var ia = new Uint8Array(byteString.length);
    for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }

    return new Blob([ia], {type:mimeString});
}

function _blobToDataURL(blob) {
    var u8a=_blobToUint8Array(blob)
    return 'data:'+blob.type+';base64,'+btoa(_Uint8ToString(u8a));
}

function _blobToUint8Array(b) {
    var uri = URL.createObjectURL(b),
        xhr = new XMLHttpRequest(),
        i,
        ui8;

    xhr.open('GET', uri, false);
    // The magic happens below, which overrides the MIME type, forcing the browser to treat it as plain text, 
    // using a user-defined character set. This tells the browser not to parse it, and to let the bytes pass through unprocessed.
    xhr.overrideMimeType('text\/plain; charset=x-user-defined'); // NOTE: Key #1
    xhr.send(null);

    URL.revokeObjectURL(uri); // Avoid resource leak
    if (xhr.status != 200) return [];

    ui8 = new Uint8Array(xhr.responseText.length); // NOTE: was response, not responseText.  Not sure if it matters.

    for (i = 0; i < xhr.responseText.length; ++i) {
        ui8[i] = xhr.responseText.charCodeAt(i) & 0xff; // NOTE: Key #2
    }

    return ui8;
}


function _load_binary_resource(url) {
  var req = new XMLHttpRequest();
  req.open('GET', url, false);
  //XHR binary charset opt by Marcus Granado 2006 [http://mgran.blogspot.com]
  req.overrideMimeType('text\/plain; charset=x-user-defined');
  req.send(null);
  if (req.status != 200) return '';
  //window.req=req;
  //var b=new Blob; // Convert data to blob?
  return req.responseText; // NOTE: Use return: var abyte = _load_binary_resource(url).charCodeAt(x) & 0xff; // throw away high-order byte (f7)
}

function _save_binary_resource(url, data) {
    var xhr = new XMLHttpRequest();
  //req.open('PUT', url, false);
  //XHR binary charset opt by Marcus Granado 2006 [http://mgran.blogspot.com]
  //req.overrideMimeType('text\/plain; charset=x-user-defined');
  //req.send(null);
    xhr.open('PUT', url);
    xhr.responseType = "blob"; // force the HTTP response, response-type header to be blob
    xhr.onload = () => {
        if (xhr.status != 204) {
            console.error("status="+xhr.status+"; retry later");
        }
    }
    var blob=new Blob([data], {type: 'text/plain; charset=x-user-defined'});
    xhr.send(blob);
    return true;
}

// For short input, Decode base64 back to Uint8Array
//var u8_2 = new Uint8Array(atob(b64encoded).split("").map(function(c) {
//    return c.charCodeAt(0); }));
//    OR use below: var b64encoded = btoa(Uint8ToString(u8));
function _Uint8ToString(u8a) {
  var CHUNK_SZ = 0x8000;
  var c = [];
  for (var i=0; i < u8a.length; i+=CHUNK_SZ) {
    c.push(String.fromCharCode.apply(null, u8a.subarray(i, i+CHUNK_SZ)));
  }
  return c.join("");
}

function _asyncBlobToDataURL(blob, callback) {
    var a = new FileReader();
    a.onload = function(e) {callback(e.target.result);}
    a.readAsDataURL(blob);
}

function _blobToString(b) {
    var u, x;
    u = URL.createObjectURL(b);
    x = new XMLHttpRequest();
    x.open('GET', u, false); // although sync, you're not fetching over internet
    x.send();
    URL.revokeObjectURL(u);
    return x.responseText;
}

function _asyncBlobToString(blob, done) {
    var reader = new FileReader();
    reader.onload = function() { done(reader.result); }
    reader.readAsText(blob);   
}

function _init(isDs) {
    _h = $(window).height();
    _w = $(window).width();
    
    if(isDs) { _initWebSock(); }
    // Started in app-init.js // else { _initApp(); }
//     if(dirTree && dirTree != '') {
//         alert('dirTree='+dirTree);
//         dirTree=JSON.parse(dirTree);
//     }
    
//    if(typeof OnStart === 'function') { OnStart(); }
}

////////////////////////////////
// Modified _WebSock by Charles Wilt from 11/2/16 post to DroidScript Google Group
////////////////////////////////
function _WebSock( id, ip, port, options )
{
   var m_OnMessage = null;
   var m_sock = null;
   var m_timer = null;
   
   var m_OnOpen = null;
   var m_OnClose = null;
   var m_IsOpen = null;

   
    console.log( "Opening web socket:" + id );
   if( !port ) port = 8080;
  m_sock = new WebSocket( "ws://"+ip+":"+port );
  m_sock.onopen = OnOpen;
 m_sock.onmessage = OnMessage;
   m_sock.onclose = OnClose;
       m_sock.onerror = OnError;
       m_timer = setInterval( CheckSocket, 7000 );
   
    function OnOpen() {
        console.log( "Socket Open: "+id );
       if (m_OnOpen) m_OnOpen(id);
       m_IsOpen=true;
   }
   
   function CheckSocket() {  
       if( m_sock.readyState != 1 ) {
           console.log( "Re-opening web socket:" + id );
           m_sock = new WebSocket( "ws://"+ip+":"+port );
       }
   }
   
   function OnClose() {
        console.log( "Socket Closed: "+id );
        if (m_OnClose) m_OnClose(id);
       m_IsOpen=false;
   }
   
   function OnError(e) { console.log( "Socket Error: "+e.data ); }
   function OnMessage( msg ) { if( m_OnMessage ) m_OnMessage( msg.data ); }
   
   
 this.Close = function() { m_sock.close(); }
   this.GetSocket = function() { return m_sock; }
   this.SetOnMessage = function( callback ) { m_OnMessage = callback; }
   
   this.SetOnOpen = function( callback ) { m_OnOpen = callback; }
   this.SetOnClose = function( callback ) { m_OnClose = callback; }
   this.IsOpen = function(){return m_IsOpen;}
   
   this.Send = function( msg ) {
       if( m_sock.readyState != 1 ) console.log( "Socket not ready:"+m_sock );
        else m_sock.send( msg );
   }
   return this;
}
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    function _findTarget(ev) {
        for(var xa=1; xa<__idMap.length; xa++) {
            if(__idMap[xa] && __idMap[xa].impl[0] == ev.currentTarget) {
                return __idMap[xa];
            }
        }
        return null;
    }
    function _handleTouchEvent( jqHandler, action, callback ) {
        this.touchable=true;
        var obj=this;
        jqHandler.call(this, function(ev) {
            ev.preventDefault(); // Needed to prevent default link action.  Apparently using mouseup doesn't return callback value.
            if(obj.touchable) { 
                var bcr=obj[0].getBoundingClientRect(); // x,y,width,height,top,bottom,left,right
                ev.X=(ev.pageX - bcr.x) / obj[0].width;
                ev.Y=(ev.pageY - bcr.y) / obj[0].height;
                ev.action=action;
                ev.source=_findTarget(ev);
                callback(ev);
            }
            return false; 
            
            //ckTouch.bind(callback)(ev);
        }); 
        this.css("cursor",(callback?"pointer":"auto"));
    }

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////



/*

// function _asyncDataURItoBlob(dataURI, done) {
//     fetch(dataURI).then(res => res.blob()).then(blob => { // NOTE: fetch does not work in Safari or IE
//         // var fd = new FormData()
//         // fd.append('image', blob, 'filename')
//         done(blob);
//         // Upload
//         // fetch('upload', {method: 'POST', body: fd})
//     });
// }

function CreatePage(title)
{
	var pageData = { id:(++_ids) };

	var page = $("<div data-role=\"page\"></div>", pageData);
	page.attr("id", "page" + pageData.id);

	// Create page content container
	var pageContent = $("<div role=\"main\" class=\"ui-content\"></div>");
	page.append(pageContent);

	var header = CreateToolbar(title);
	header.attr("data-role", "header");
	header.attr("id", "header-page" + pageData.id);
	page.prepend( header );

	var footer = CreateToolbar("");
	footer.attr("data-role", "footer");
	footer.attr("id", "footer-page" + pageData.id);
	page.append( footer );

	page.GetHeader = function() {
		return header;
	};

	page.GetFooter = function() {
		return footer;
	};

	page.Show = function() {
		//navigate to the page
    	$.mobile.changePage("#page" + pageData.id, "pop", false, true);
	};

	return page;
}

function CreateToolbar(title)
{
	var toolbarData = { id:(++_ids) };

	var toolbar = $("<div><h1>" + title + "</h1></div>", toolbarData);

	toolbar.AddButton = function(button, options) {
		if(options && options.toLowerCase(options).indexOf("right") >= 0)
		{
			button.addClass("ui-btn-right ui-btn-inline");
		}
		else
		{
			button.addClass("ui-btn-inline");
		}

		this.append(button);
	}

	return toolbar;
}

*/
