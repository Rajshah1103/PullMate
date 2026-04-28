// src/gitHandler.js
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import notifier from "node-notifier";

function expandHome(p) {
  if (!p) return p;
  if (p.startsWith("~")) return path.join(os.homedir(), p.slice(1));
  return p;
}

function runGitCommand(repoPath, command) {
  const fullPath = expandHome(repoPath);
  try {
    return execSync(command, { cwd: fullPath, encoding: "utf-8", stdio: "pipe" });
  } catch (err) {
    return { error: err.message };
  }
}

function isGitRepo(repoPath) {
  const fullPath = expandHome(repoPath);
  return fs.existsSync(path.join(fullPath, ".git"));
}

function hasUncommittedChanges(repoPath) {
  const output = runGitCommand(repoPath, "git status --porcelain");
  return typeof output === "string" && output.trim().length > 0;
}

function getCurrentBranch(repoPath) {
  const result = runGitCommand(repoPath, "git rev-parse --abbrev-ref HEAD");
  if (typeof result !== "string") return null;
  return result.trim();
}

function runHook(command, repoPath) {
  if (!command || !command.trim()) return;
  try {
    execSync(command, { cwd: repoPath, encoding: "utf-8", stdio: "pipe" });
  } catch (err) {
    // hook failures are non-fatal
  }
}

function updateAllLocalBranches(repoPath) {
  const fullPath = expandHome(repoPath);
  const currentBranch = getCurrentBranch(fullPath);

  const localBranchesResult = runGitCommand(fullPath, "git for-each-ref --format='%(refname:short) %(upstream:short)' refs/heads");

  if (typeof localBranchesResult !== "string") {
    return { error: "Could not get local branches", details: localBranchesResult.error };
  }

  const branchUpdates = [];
  const lines = localBranchesResult.trim().split("\n").filter(line => line.trim());

  for (const line of lines) {
    const [localBranch, remoteBranch] = line.trim().split(" ");

    if (!remoteBranch) continue;

    if (localBranch === currentBranch) {
      const localCommit = runGitCommand(fullPath, `git rev-parse HEAD`);
      const remoteCommit = runGitCommand(fullPath, `git rev-parse ${remoteBranch}`);

      if (typeof localCommit === "string" && typeof remoteCommit === "string" && localCommit.trim() === remoteCommit.trim()) {
        branchUpdates.push({ branch: localBranch, status: "up-to-date", message: "already up-to-date", isCurrent: true });
      } else {
        const mergeResult = runGitCommand(fullPath, `git merge --ff-only ${remoteBranch}`);
        branchUpdates.push({
          branch: localBranch,
          status: typeof mergeResult !== "string" ? "failed" : (mergeResult.includes("Already up to date") ? "up-to-date" : "updated"),
          message: typeof mergeResult !== "string" ? mergeResult.error : mergeResult || "merged successfully",
          isCurrent: true
        });
      }
    } else {
      const localCommit = runGitCommand(fullPath, `git rev-parse ${localBranch}`);
      const remoteCommit = runGitCommand(fullPath, `git rev-parse ${remoteBranch}`);

      if (typeof localCommit !== "string" || typeof remoteCommit !== "string") {
        branchUpdates.push({ branch: localBranch, status: "failed", message: "Could not compare commits", isCurrent: false });
        continue;
      }

      if (localCommit.trim() === remoteCommit.trim()) {
        branchUpdates.push({ branch: localBranch, status: "up-to-date", message: "already up-to-date", isCurrent: false });
        continue;
      }

      const mergeBaseResult = runGitCommand(fullPath, `git merge-base ${localBranch} ${remoteBranch}`);

      if (typeof mergeBaseResult !== "string") {
        branchUpdates.push({ branch: localBranch, status: "failed", message: mergeBaseResult.error, isCurrent: false });
        continue;
      }

      if (mergeBaseResult.trim() === localCommit.trim()) {
        const updateResult = runGitCommand(fullPath, `git update-ref refs/heads/${localBranch} ${remoteBranch}`);
        branchUpdates.push({
          branch: localBranch,
          status: typeof updateResult !== "string" ? "failed" : "updated",
          message: typeof updateResult !== "string" ? updateResult.error : "fast-forwarded",
          isCurrent: false
        });
      } else if (mergeBaseResult.trim() === remoteCommit.trim()) {
        branchUpdates.push({ branch: localBranch, status: "up-to-date", message: "local ahead of remote", isCurrent: false });
      } else {
        branchUpdates.push({ branch: localBranch, status: "diverged", message: "Local branch has diverged from remote", isCurrent: false });
      }
    }
  }

  return { branchUpdates };
}

export function getRepoStatus(repoPath, { fetch = true } = {}) {
  const fullPath = expandHome(repoPath);
  const repoName = path.basename(fullPath);
  const timestamp = new Date().toISOString();

  if (!isGitRepo(fullPath)) {
    return { repoPath: fullPath, repoName, status: "not-a-git-repo", timestamp };
  }

  const dirty = hasUncommittedChanges(fullPath);
  const branch = getCurrentBranch(fullPath);

  if (fetch) {
    runGitCommand(fullPath, "git fetch --all");
  }

  let behind = 0;
  let ahead = 0;
  let hasRemote = false;

  if (branch) {
    const behindResult = runGitCommand(fullPath, `git rev-list HEAD..origin/${branch} --count`);
    if (typeof behindResult === "string") {
      behind = parseInt(behindResult.trim(), 10) || 0;
      hasRemote = true;
    }
    const aheadResult = runGitCommand(fullPath, `git rev-list origin/${branch}..HEAD --count`);
    if (typeof aheadResult === "string") {
      ahead = parseInt(aheadResult.trim(), 10) || 0;
    }
  }

  let status;
  if (dirty) status = "dirty";
  else if (!hasRemote) status = "no-remote";
  else if (behind > 0 && ahead > 0) status = "diverged";
  else if (behind > 0) status = "behind";
  else if (ahead > 0) status = "ahead";
  else status = "up-to-date";

  return { repoPath: fullPath, repoName, branch, dirty, behind, ahead, hasRemote, status, timestamp };
}

export function pullRepo(repoPath, { hooks = {} } = {}) {
  const fullPath = expandHome(repoPath);
  const timestamp = new Date().toISOString();
  const repoName = path.basename(fullPath);

  if (!isGitRepo(fullPath)) {
    notifier.notify({ title: "PullMate", message: `${repoName}: Not a git repo` });
    return {
      repoPath: fullPath,
      repoName,
      branch: null,
      status: "❌ not-a-git-repo",
      message: "Directory is not a git repository",
      timestamp
    };
  }

  if (hasUncommittedChanges(fullPath)) {
    notifier.notify({ title: "PullMate", message: `${repoName}: Uncommitted changes` });
    return {
      repoPath: fullPath,
      repoName,
      branch: getCurrentBranch(fullPath),
      status: "⚠️ dirty",
      message: "Uncommitted changes — stash or commit to sync",
      timestamp
    };
  }

  const branch = getCurrentBranch(fullPath);
  if (!branch) {
    notifier.notify({ title: "PullMate", message: `${repoName}: Cannot detect branch` });
    return {
      repoPath: fullPath,
      repoName,
      branch: null,
      status: "❌ cannot-detect-branch",
      message: "Unable to detect current branch",
      timestamp
    };
  }

  runHook(hooks.beforePull, fullPath);

  const fetchResult = runGitCommand(fullPath, "git fetch --all");
  const updateAllBranchesResult = updateAllLocalBranches(fullPath);
  const mergeResult = runGitCommand(fullPath, `git merge --ff-only origin/${branch}`);

  let status = "✅ up-to-date";
  let message = "";
  let detailedMessage = "";
  let branchUpdateSummary = "";

  if (updateAllBranchesResult && updateAllBranchesResult.branchUpdates) {
    const updates = updateAllBranchesResult.branchUpdates;
    const updatedBranches = updates.filter(u => u.status === "updated" && !u.isCurrent);
    const upToDateBranches = updates.filter(u => u.status === "up-to-date" && !u.isCurrent);
    const divergedBranches = updates.filter(u => u.status === "diverged");
    const failedBranches = updates.filter(u => u.status === "failed" && !u.isCurrent);

    const summaryParts = [];
    if (updatedBranches.length > 0) summaryParts.push(`${updatedBranches.length} branch(es) updated: ${updatedBranches.map(b => b.branch).join(", ")}`);
    if (upToDateBranches.length > 0) summaryParts.push(`${upToDateBranches.length} branch(es) up-to-date`);
    if (divergedBranches.length > 0) summaryParts.push(`${divergedBranches.length} branch(es) diverged: ${divergedBranches.map(b => b.branch).join(", ")}`);
    if (failedBranches.length > 0) summaryParts.push(`${failedBranches.length} branch(es) failed: ${failedBranches.map(b => b.branch).join(", ")}`);

    branchUpdateSummary = summaryParts.length > 0 ? "\nOther branches: " + summaryParts.join("; ") : "";
  }

  const hasUpdates = updateAllBranchesResult?.branchUpdates?.some(u => u.status === "updated") || false;
  const fetchMessage = hasUpdates ? "Updates fetched from remote" : "No updates from remote";

  if (mergeResult && typeof mergeResult !== "string") {
    status = "❌ failed";
    message = mergeResult.error;
    detailedMessage = `FETCH: ${typeof fetchResult === "string" ? fetchResult : "N/A"}\nMERGE ERROR: ${mergeResult.error}${branchUpdateSummary}`;

    if (message.includes("Not possible to fast-forward") ||
        message.includes("divergent branches") ||
        message.includes("cannot fast-forward")) {
      status = "⚠️ diverged";
      notifier.notify({ title: "PullMate Warning", message: `${repoName}: Branch ${branch} diverged from upstream` });
    } else {
      notifier.notify({ title: "PullMate Error", message: `${repoName}: ${message}` });
    }
  } else if (mergeResult) {
    const upToDateMessages = ["Already up to date", "Already up-to-date", "Current branch", "up to date"];
    const isCurrentBranchUpToDate = upToDateMessages.some(msg => mergeResult.toLowerCase().includes(msg.toLowerCase()));
    const currentBranchWasUpdated = mergeResult.includes("Fast-forward") ||
      mergeResult.includes("Updating") ||
      mergeResult.includes("files changed") ||
      mergeResult.includes("insertions") ||
      mergeResult.includes("deletions");

    if (currentBranchWasUpdated || hasUpdates) {
      status = "✅ updated";
      detailedMessage = `FETCH: ${fetchMessage}\nMERGE: ${mergeResult}${branchUpdateSummary}`;
      notifier.notify({ title: "PullMate", message: `${repoName}: Repository updated` });
      runHook(hooks.afterPull, fullPath);
    } else if (isCurrentBranchUpToDate) {
      status = "✅ up-to-date";
      detailedMessage = `FETCH: ${fetchMessage}\nMERGE: ${mergeResult}${branchUpdateSummary}`;
    } else {
      status = "✅ up-to-date";
      detailedMessage = `FETCH: ${fetchMessage}\nMERGE: ${mergeResult}${branchUpdateSummary}`;
    }
  } else {
    if (hasUpdates) {
      status = "✅ updated";
      detailedMessage = `FETCH: ${fetchMessage}\nMERGE: No output (current branch up to date)${branchUpdateSummary}`;
      runHook(hooks.afterPull, fullPath);
    } else {
      status = "✅ up-to-date";
      detailedMessage = `FETCH: ${fetchMessage}\nMERGE: No output (likely up to date)${branchUpdateSummary}`;
    }
  }

  return {
    repoPath: fullPath,
    repoName,
    branch,
    status,
    message: detailedMessage || message,
    timestamp,
    fetchOutput: typeof fetchResult === "string" ? fetchResult : "",
    mergeOutput: typeof mergeResult === "string" ? mergeResult : "",
    branchUpdates: updateAllBranchesResult?.branchUpdates || []
  };
}
