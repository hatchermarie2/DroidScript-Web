# NOTES

To avoid warnings because of large number of files being watched for changes, add the following line 519 to $HOME/node_modules/watchr/es2015/index.js:

if(this.listenerTaskGroup.getMaxListeners() == 10) { this.listenerTaskGroup.setMaxListeners(0); }

# ChromeOS / Crouton / Android Integration

It is tricky but possible to integrate Linux running in Crouton, under ChromeOS, so you can develop Android apps, test them under ChromeOS using the built-in Android support, and also test them under DroidScript-Web running on Linux in Crouton, without having to copy files between the two environments.  This can be achived by mounting the Android sdcard folder under /media/removable/sdcard, using the included mount-android script.  This script must be run outside of Crouton, preferably being called by your /usr/local/bin/startkde script.

Within Crouton, checkout this repository, including its version of sdcard (containing a few samples).  Then create additional symlinks (untracked) in the sdcard/DroidScript or sdcard/ folder, to the equivalent locations in the now bind-mounted Android sdcard directory (/media/removable/sdcard).

# Ideas not yet implemented

* Use YDN-DB (HTML5 javascript database library for web apps) to emulate sqlite within the browser, as a fallback for browsers that don't support WebSQL. https://yathit.github.io/ydn-db/index.html
* Use SockJS (browser WebSocket-like library) to provide WebSocket support to browsers/firewalls that don't support it.  https://github.com/sockjs/sockjs-client
 
* Filesystem:

* FIXME: FILE ../_index/Img/_index.png not found (Relative paths not resolved)
* Research using HTML5 manifest to pre-cache files and folders.

*   Change filesystem functions to rely on browser cache rather than localStorage (space too limited, inefficient)
*   - Limit HTML5 manifest to only pre-cache app files/folders, not system ones (unless override).
*   - Folders should be sync'd prior to startup, with file sync occurring in background.
*   - ListFolder should rely on already-sync'd folders before app starts
*   - ReadFile will have to use synchronous XHR but hopefully browser caching should mitigate delays.
*   Add support for /sdcard/DroidScript/* (except _index) redirecting (301) to /app, so browser cache will work effectively.
*   Add support for /sdcard/DroidScript/_index/*  redirecting 301 to /
*   Implement filesystem sync TO server.
* GUI:
*   Fix list colors, font sizes (_index for example)
*   Get <BACK> menu to work.
*   Add <MENU> button ||| to do the same thing as <BACK> menu on browsers that may block <BACK>
