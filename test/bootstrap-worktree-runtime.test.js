const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

test("bootstrap-worktree-runtime.sh copies env, node_modules, and store", () => {
  const tempRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "crm-frontend-bootstrap-worktree-")
  );
  const repoPath = path.join(tempRoot, "repo");
  const worktreePath = path.join(tempRoot, "repo-feature");
  const scriptPath = path.resolve(__dirname, "../scripts/bootstrap-worktree-runtime.sh");

  fs.mkdirSync(repoPath, { recursive: true });
  fs.mkdirSync(worktreePath, { recursive: true });
  fs.writeFileSync(path.join(repoPath, ".env"), "PORT=3000\n");
  fs.writeFileSync(path.join(repoPath, ".env.local"), "AUTH_ENABLED=false\n");
  fs.mkdirSync(path.join(repoPath, ".store"), { recursive: true });
  fs.writeFileSync(path.join(repoPath, ".store", "marker.txt"), "shared-store\n");
  fs.mkdirSync(path.join(repoPath, "node_modules"), { recursive: true });
  fs.writeFileSync(
    path.join(repoPath, "node_modules", "marker.txt"),
    "shared-node-modules\n"
  );

  execFileSync("bash", [scriptPath, worktreePath, repoPath], {
    cwd: repoPath,
    stdio: "pipe",
  });

  assert.equal(fs.readFileSync(path.join(worktreePath, ".env"), "utf8"), "PORT=3000\n");
  assert.equal(
    fs.readFileSync(path.join(worktreePath, ".env.local"), "utf8"),
    "AUTH_ENABLED=false\n"
  );
  assert.equal(
    fs.readFileSync(path.join(worktreePath, ".store", "marker.txt"), "utf8"),
    "shared-store\n"
  );
  assert.equal(
    fs.readFileSync(path.join(worktreePath, "node_modules", "marker.txt"), "utf8"),
    "shared-node-modules\n"
  );
});

test("create-worktree.sh creates a worktree and bootstraps runtime state", () => {
  const tempRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "crm-frontend-create-worktree-")
  );
  const repoPath = path.join(tempRoot, "repo");
  const worktreePath = path.join(tempRoot, "repo-feature");
  const scriptPath = path.resolve(__dirname, "../scripts/create-worktree.sh");

  fs.mkdirSync(repoPath, { recursive: true });
  execFileSync("git", ["init", "-b", "main"], { cwd: repoPath, stdio: "pipe" });
  execFileSync("git", ["config", "user.name", "Codex Test"], {
    cwd: repoPath,
    stdio: "pipe",
  });
  execFileSync("git", ["config", "user.email", "codex@example.com"], {
    cwd: repoPath,
    stdio: "pipe",
  });
  fs.mkdirSync(path.join(repoPath, "scripts"), { recursive: true });
  fs.copyFileSync(
    path.resolve(__dirname, "../scripts/create-worktree.sh"),
    path.join(repoPath, "scripts", "create-worktree.sh")
  );
  fs.copyFileSync(
    path.resolve(__dirname, "../scripts/bootstrap-worktree-runtime.sh"),
    path.join(repoPath, "scripts", "bootstrap-worktree-runtime.sh")
  );
  fs.writeFileSync(path.join(repoPath, "README.md"), "# temp repo\n");
  fs.writeFileSync(path.join(repoPath, ".env"), "PORT=3000\n");
  fs.mkdirSync(path.join(repoPath, ".store"), { recursive: true });
  fs.writeFileSync(path.join(repoPath, ".store", "marker.txt"), "shared-store\n");
  fs.mkdirSync(path.join(repoPath, "node_modules"), { recursive: true });
  fs.writeFileSync(
    path.join(repoPath, "node_modules", "marker.txt"),
    "shared-node-modules\n"
  );
  execFileSync("git", ["add", "README.md"], { cwd: repoPath, stdio: "pipe" });
  execFileSync("git", ["commit", "-m", "init"], { cwd: repoPath, stdio: "pipe" });

  execFileSync("bash", [path.join(repoPath, "scripts", "create-worktree.sh"), "feature-branch", worktreePath, "main"], {
    cwd: repoPath,
    stdio: "pipe",
  });

  assert.equal(fs.readFileSync(path.join(worktreePath, ".env"), "utf8"), "PORT=3000\n");
  assert.equal(
    fs.readFileSync(path.join(worktreePath, ".store", "marker.txt"), "utf8"),
    "shared-store\n"
  );
  assert.equal(
    fs.readFileSync(path.join(worktreePath, "node_modules", "marker.txt"), "utf8"),
    "shared-node-modules\n"
  );
});
