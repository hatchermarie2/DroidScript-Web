#!/bin/sh

[ "$1" = "" ] && echo "What is this checkin about?  Supply a description." && exit 1

# Clean up temporary files
find -name '.appcache' -exec rm {} \;
# Clean up links in the sdcard folder (recreated on running ./dstart)
find sdcard -type l -exec rm {} \;

git commit -a -m "$1"
