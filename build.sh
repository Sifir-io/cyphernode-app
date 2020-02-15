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

build_cn_app_ui
build_docker_images
