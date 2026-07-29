#!/usr/bin/env bash
# PostgreSQL local para desarrollo/tests (sin Docker, sin root).
# Uso: bash scripts/dev-db.sh {start|stop|status|reset}
#
# En producción se usa docker-compose; esto es solo para el entorno de dev donde
# el daemon de Docker no está disponible.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PGDATA="${HBM_PGDATA:-$ROOT/.devdb}"
PGSOCK="${HBM_PGSOCK:-/tmp/hbmpg}"   # ruta corta: el socket Unix tiene límite de 107 bytes
PGPORT="${HBM_PGPORT:-5432}"
PGUSER="hbm"
PGDB="hbm"

start() {
  mkdir -p "$PGSOCK"
  if [ ! -d "$PGDATA/base" ]; then
    echo "Inicializando cluster en $PGDATA..."
    initdb -D "$PGDATA" -U "$PGUSER" --auth=trust --encoding=UTF8 >/dev/null
  fi
  if pg_ctl -D "$PGDATA" status >/dev/null 2>&1; then
    echo "Postgres ya está en marcha."
  else
    pg_ctl -D "$PGDATA" \
      -o "-p $PGPORT -k $PGSOCK -c listen_addresses=127.0.0.1" \
      -l "$PGDATA/pg.log" start
  fi
  # Crea la base de datos si no existe.
  if ! psql -h 127.0.0.1 -p "$PGPORT" -U "$PGUSER" -d "$PGDB" -c '\q' 2>/dev/null; then
    createdb -h 127.0.0.1 -p "$PGPORT" -U "$PGUSER" "$PGDB"
    echo "Base de datos '$PGDB' creada."
  fi
  echo "Postgres listo en 127.0.0.1:$PGPORT (db=$PGDB, user=$PGUSER)."
}

stop() {
  pg_ctl -D "$PGDATA" stop -m fast || true
}

status() {
  pg_ctl -D "$PGDATA" status || true
}

reset() {
  stop
  rm -rf "$PGDATA"
  echo "Cluster eliminado. Ejecuta 'start' y luego 'npm run db:deploy'."
}

case "${1:-start}" in
  start) start ;;
  stop) stop ;;
  status) status ;;
  reset) reset ;;
  *) echo "Uso: $0 {start|stop|status|reset}"; exit 1 ;;
esac
