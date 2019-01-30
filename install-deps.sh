#!/bin/sh

which npm || sudo apt install npm
which pnpm || sudo npm install -g pnpm
pnpm install colors console-ten watchr websocket better-sqlite3 node-ipc command-line-args errlop editions
