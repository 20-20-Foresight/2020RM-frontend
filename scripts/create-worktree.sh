#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  bash ./scripts/create-worktree.sh <branch-name> <worktree-path> [base-ref]

Creates a git worktree from the current repository and bootstraps the local
runtime state into the new checkout:
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

if [[ $# -lt 2 || $# -gt 3 ]]; then
  usage >&2
  exit 1
fi

BRANCH_NAME="$1"
WORKTREE_PATH_INPUT="$2"
BASE_REF="${3:-HEAD}"
REPO_ROOT="$(git rev-parse --show-toplevel)"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ "$WORKTREE_PATH_INPUT" = /* ]]; then
  WORKTREE_PATH="$WORKTREE_PATH_INPUT"
else
  WORKTREE_PATH="$(cd "$PWD" && pwd)/$WORKTREE_PATH_INPUT"
fi

echo "Creating worktree:"
echo "  repo:   $REPO_ROOT"
echo "  branch: $BRANCH_NAME"
echo "  path:   $WORKTREE_PATH"
echo "  base:   $BASE_REF"

git -C "$REPO_ROOT" worktree add "$WORKTREE_PATH" -b "$BRANCH_NAME" "$BASE_REF"
bash "$SCRIPT_DIR/bootstrap-worktree-runtime.sh" "$WORKTREE_PATH" "$REPO_ROOT"

echo "Worktree ready: $WORKTREE_PATH"
