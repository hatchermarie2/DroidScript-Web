#!/bin/sh

echo "DRY RUN (no deletes done):"
rsync -av --dry-run --delete * pi@192.168.201.1:~/DroidScript-Web/ | sed -e 's/^/    /g'

echo ""
echo "ACTUAL:"
rsync -av * pi@192.168.201.1:~/DroidScript-Web/
