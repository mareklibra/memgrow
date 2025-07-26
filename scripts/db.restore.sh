#!/bin/bash

source .env

export DIR=./DB_BACKUPS

if [ x$1 != x ] ; then
  export FILE=$1
else
  echo Usage: $0 ${DIR}/[FILENAME]
  ls ${DIR}
  exit 1
fi

pg_restore --clean --if-exists -j 4 -v -d "${POSTGRES_URL}" ${FILE}

