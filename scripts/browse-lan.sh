#!/bin/sh

nmap -sS -O 192.168.200.1-254 -p 139 2>/dev/null | while read line; do [ "${line:0:9}" = "Nmap scan" ] && save=${line:20}; echo "$line" | grep -q 139/tcp.*open.*netbios-ssn && echo "OPEN: $save"; done
