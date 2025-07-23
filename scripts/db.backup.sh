#!/bin/bash

source .env

export DATE=`date +%D_%T|sed 's/\//_/g'|sed 's/:/-/g'`
export DIR=./DB_BACKUPS
export FILE=${DIR}/memgrow.db.${DATE}

mkdir -p ${DIR}
pg_dump -Fc -v -d "${POSTGRES_URL}" -f ${FILE}

