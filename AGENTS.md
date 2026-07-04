# Repo Notes

## Worktrees

- Use `bash ./scripts/create-worktree.sh <branch-name> <worktree-path> [base-ref]` instead of raw `git worktree add`.
- If a worktree already exists but is missing runtime files, use `bash ./scripts/bootstrap-worktree-runtime.sh <worktree-path>`.
- Treat the main checkout as the source of truth for local runtime bootstrap files such as `.env`, `.env.*`, `node_modules`, and `.store`.
