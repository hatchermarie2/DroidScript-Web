#!/bin/sh

find -name '.appcache' -exec rm {} \;
[ "$1" = "" ] && echo "What is this checkin about?  Supply a description." && exit 1

git commit -a -m "$1"
