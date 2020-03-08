#!/bin/bash

# 0.0.1 - Alpha: reckless cypherpunks only
SIFIR_CN_APP_UI_VERSION="0.0.1-local"
SIFIR_CN_APP_VERSION="0.0.1-local"

trace()
{
  if [ -n "${TRACING}" ]; then
    echo "[$(date +%Y-%m-%dT%H:%M:%S%z)] ${1}" > /dev/stderr
  fi
}

build_cn_app_ui(){
 cd sifir-cn-app-ui/ && npm i && npm run build
 cd ..
}
build_docker_images() {
  trace "Build Sifir's App and UI"
  docker build sifir-cn-app-ui/ -t sifir/cn-app-ui:$SIFIR_CN_APP_UI_VERSION \
  && docker build sifir-cn-app/ -t sifir/cn-app:$SIFIR_CN_APP_VERSION 
}


setup_sqllite() {
# make sqllite data holding dirs
   if [[ -f ./sifir-cn-app/data/sqlite/db.dat ]]; then
   	echo "Detected DB already exists, will skip creating it!";
   	echo "Note: If you want to flush/delete your DB run the following command:\necho '' > ./sifir-cn-app/data/sqlite/db.dat"
   else
   	echo "Creating SQL lite db files.."
   	mkdir -p ./sifir-cn-app/data/sqlite
   	touch ./sifir-cn-app/data/sqlite/{db.dat,dev-db.dat}
   fi
}

setup_creds_env_file() {
if [[ -f ./.env ]]; then
  echo "Detected .env file already exists, will skip creating it!";
else
cat <<- HERE > .env
# ----------------------------------------------------------------------------------
# vvv--------- UPDATE THE FOLLOWING SETTINGS TO MATCHING YOU CN INSTALLATION ----vvv
#
# TODO: These should be provided by CN apps frame work as env variables. Would make a zero config installation :)
#
# Credentials: The cyphernode API key and key id you want Sifir to use
#
CYPHERNODE_API_KEY=
CYPHERNODE_API_KEY_ID=
CYPHERNODE_ONION_URL=
#
# ^^^ -----------------------------------------------------------------------------
# ^^^ -----------------------------------------------------------------------------
HERE
fi
}

build_cn_app_ui
build_docker_images
setup_sqllite
setup_creds_env_file
echo "Sifir Built !\n";
echo "Edit .env file with your cyphernode api keys then run ./run.sh";
