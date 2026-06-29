#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  bash ./scripts/bootstrap-worktree-runtime.sh <worktree-path> [source-repo-root]

Copies local runtime paths from the source repository into an existing worktree:
  - .env
  - .env.*
  - node_modules
  - .store
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ $# -lt 1 || $# -gt 2 ]]; then
  usage >&2
  exit 1
fi

WORKTREE_PATH_INPUT="$1"
SOURCE_REPO_ROOT_INPUT="${2:-$(git rev-parse --show-toplevel)}"

if [[ "$WORKTREE_PATH_INPUT" = /* ]]; then
  WORKTREE_PATH="$WORKTREE_PATH_INPUT"
else
  WORKTREE_PATH="$(cd "$PWD" && pwd)/$WORKTREE_PATH_INPUT"
fi

if [[ "$SOURCE_REPO_ROOT_INPUT" = /* ]]; then
  SOURCE_REPO_ROOT="$SOURCE_REPO_ROOT_INPUT"
else
  SOURCE_REPO_ROOT="$(cd "$PWD" && pwd)/$SOURCE_REPO_ROOT_INPUT"
fi

mkdir -p "$WORKTREE_PATH"

backup_target_if_needed() {
  local target_path="$1"
  local target_name
  local timestamp

  if [[ ! -e "$target_path" && ! -L "$target_path" ]]; then
    return 0
  fi
  if [[ -L "$target_path" ]]; then
    return 0
  fi

  target_name="$(basename "$target_path")"
  timestamp="$(date +%Y-%m-%d-%H%M%S)"
  mv "$target_path" "${target_path}.worktree-backup-${timestamp}"
  echo "Backed up ${target_name} to ${target_path}.worktree-backup-${timestamp}"
}

remove_target_path() {
  local target_path="$1"
  if [[ -d "$target_path" && ! -L "$target_path" ]]; then
    rm -rf "$target_path"
    return 0
  fi
  rm -f "$target_path"
}

copy_path() {
  local relative_path="$1"
  local source_path="$SOURCE_REPO_ROOT/$relative_path"
  local target_path="$WORKTREE_PATH/$relative_path"

  if [[ ! -e "$source_path" && ! -L "$source_path" ]]; then
    return 0
  fi

  mkdir -p "$(dirname "$target_path")"
  backup_target_if_needed "$target_path"
  remove_target_path "$target_path"
  cp -R "$source_path" "$target_path"
  echo "Copied $relative_path"
}

copy_env_files() {
  local env_path
  local env_name

  for env_path in "$SOURCE_REPO_ROOT"/.env "$SOURCE_REPO_ROOT"/.env.*; do
    if [[ ! -f "$env_path" && ! -L "$env_path" ]]; then
      continue
    fi
    env_name="$(basename "$env_path")"
    if [[ "$env_name" == ".env.sample" ]]; then
      continue
    fi
    copy_path "$env_name"
  done
}

copy_env_files
copy_path "node_modules"
copy_path ".store"

echo "Runtime bootstrap ready: $WORKTREE_PATH"
