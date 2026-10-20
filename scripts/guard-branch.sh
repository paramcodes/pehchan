#!/usr/bin/env bash
#
# Refuses work on the default branch. Set PEHCHAN_ALLOW_MAIN=1 to override.

set -euo pipefail

if [ "${PEHCHAN_ALLOW_MAIN:-0}" = "1" ]; then
  exit 0
fi

branch="$(git rev-parse --abbrev-ref HEAD)"

case "$branch" in
  main|master)
    echo "refusing to commit on $branch" >&2
    echo "create a task branch first: git checkout -b <task>/<name>" >&2
    exit 1
    ;;
esac
