# NOTES

To avoid warnings because of large number of files being watched for changes, add the following line 519 to $HOME/node_modules/watchr/es2015/index.js:

if(this.listenerTaskGroup.getMaxListeners() == 10) { this.listenerTaskGroup.setMaxListeners(0); }

# ChromeOS / Crouton / Android Integration

It is tricky but possible to integrate Linux running in Crouton, under ChromeOS, so you can develop Android apps, test them under ChromeOS using the built-in Android support, and also test them under DroidScript-Web running on Linux in Crouton, without having to copy files between the two environments.  This can be achived by mounting the Android sdcard folder under /media/removable/sdcard, using the included mount-android script.  This script must be run outside of Crouton, preferably being called by your /usr/local/bin/startkde script.

Within Crouton, checkout this repository, including its version of sdcard (containing a few samples).  Then create additional symlinks (untracked) in the sdcard/DroidScript or sdcard/ folder, to the equivalent locations in the now bind-mounted Android sdcard directory (/media/removable/sdcard).
