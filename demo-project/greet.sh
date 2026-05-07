#!/usr/bin/env bash
set -euo pipefail

if [ $# -eq 0 ]; then
  echo "Usage: ./greet.sh <text>" >&2
  echo "Example: ./greet.sh world" >&2
  exit 1
fi

echo "hello $1"
