# NOTES

To avoid warnings because of large number of files being watched for changes, add the following line 519 to $HOME/node_modules/watchr/es2015/index.js:

if(this.listenerTaskGroup.getMaxListeners() == 10) { this.listenerTaskGroup.setMaxListeners(0); }
