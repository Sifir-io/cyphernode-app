#!/bin/bash
cn_cert_filefullpath="${1:-'./cacert.pem'}"
if [ ! -f "$cn_cert_filefullpath" ]; then
	echo "Missing Cyphernode cert filefull path as first argument";
	echo "You must provide the path to Cyphernode's certificate file as an argument to the run script, ex: \n ./ruh.sh ./cyphernode/dist/cyphernode/certs/cert.pem \n"
	exit -1
fi;
CYPHERNODE_GATEKEEPER_CERT_CA=$(cat "$cn_cert_filefullpath") docker-compose --env-file ./.env up ${2} 
