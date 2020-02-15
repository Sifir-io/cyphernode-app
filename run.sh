#!/bin/bash
cn_cert_filefullpath=${1:=./test.pem}
if [ ! -f "$cn_cert_filefullpath" ]; then
	echo "Missing Cyphernode cert filefull path as first argument";
	exit -1
fi;
CYPHERNODE_GATEKEEPER_CERT_CA=$(cat "$cn_cert_filefullpath") docker-compose up 
