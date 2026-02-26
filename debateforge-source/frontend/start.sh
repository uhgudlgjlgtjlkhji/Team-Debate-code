#!/usr/bin/env sh
set -eu

PORT="${PORT:-3000}"

exec npx serve -s build -l "$PORT"
