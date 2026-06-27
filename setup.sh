#!/usr/bin/env bash
# Writes backend/.env locally. Never commit backend/.env — it's gitignored.
set -euo pipefail

ENV_FILE="backend/.env"

if [ -f "$ENV_FILE" ]; then
  read -rp "$ENV_FILE already exists. Overwrite? [y/N] " confirm
  [[ "$confirm" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 0; }
fi

if [ -z "${OPENAI_API_KEY:-}" ]; then
  read -rsp "Enter your OPENAI_API_KEY: " OPENAI_API_KEY
  echo
fi

if [ -z "$OPENAI_API_KEY" ]; then
  echo "No key entered, aborting." >&2
  exit 1
fi

printf 'OPENAI_API_KEY=%s\n' "$OPENAI_API_KEY" > "$ENV_FILE"
echo "Wrote $ENV_FILE (gitignored, will not be committed)."
