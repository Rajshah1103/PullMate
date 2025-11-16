// src/gitHandler.js
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";
import notifier from "node-notifier";

// Expand ~ to home directory
function expandHome(p) {
  if (!p) return p;
  if (p.startsWith("~")) return path.join(os.homedir(), p.slice(1));
  return p;
}

// Run git command safely
function runGitCommand(repoPath, command) {
  const fullPath = expandHome(repoPath);
  try {
    return execSync(command, { cwd: fullPath, encoding: "utf-8" });
  } catch (err) {
    return { error: err.message };
  }
}

// Check if folder is a valid git repo
function isGitRepo(repoPath) {
  const fullPath = expandHome(repoPath);
  return fs.existsSync(path.join(fullPath, ".git"));
}

// Check for uncommitted changes
function hasUncommittedChanges(repoPath) {
  const output = runGitCommand(repoPath, "git status --porcelain");
  return output && output.length > 0;
}

// Detect current branch
function getCurrentBranch(repoPath) {
  const result = runGitCommand(repoPath, "git rev-parse --abbrev-ref HEAD");
  if (result.error) return null;
  return result.trim();
}


// Safe pull function with notifications
export function pullRepo(repoPath) {
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
    notifier.notify({ title: "PullMate", message: `${repoName}: Uncommitted changes!` });
    return { 
      repoPath: fullPath, 
      repoName,
      branch: getCurrentBranch(fullPath),
      status: "⚠️ dirty (uncommitted changes)",
      message: "Repository has uncommitted changes",
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

  // Fetch all branches and tags from origin to avoid stale code across the entire repo
  const fetchResult = runGitCommand(fullPath, "git fetch origin --all --tags --prune");
  
  // Merge current branch only (no redundant fetch) with fast-forward only to avoid merge commits
  const mergeResult = runGitCommand(fullPath, `git merge --ff-only origin/${branch}`);

  let status = "🔄 up-to-date";
  let message = mergeResult;
  let detailedMessage = "";

  if (mergeResult && mergeResult.error) {
    status = "❌ failed";
    message = mergeResult.error;
    detailedMessage = `FETCH: ${fetchResult || 'N/A'}\nMERGE ERROR: ${mergeResult.error}`;

    if (message.includes("Not possible to fast-forward") || 
        message.includes("divergent branches") ||
        message.includes("cannot fast-forward")) {
      status = "⚠️ diverged";
      notifier.notify({
        title: "PullMate Warning",
        message: `${repoName}: Branch ${branch} diverged from upstream`,
      });
    } else {
      notifier.notify({ title: "PullMate Error", message: `${repoName}: ${message}` });
    }
  } else if (mergeResult) {
    // Check for various "up to date" messages that git might output
    const upToDateMessages = [
      "Already up to date",
      "Already up-to-date", 
      "Current branch",
      "up to date"
    ];
    
    const isUpToDate = upToDateMessages.some(msg => 
      mergeResult.toLowerCase().includes(msg.toLowerCase())
    );
    
    if (isUpToDate) {
      status = "✅ up-to-date";
      detailedMessage = `FETCH: ${fetchResult || 'No updates from remote'}\nMERGE: ${mergeResult}`;
    } else if (mergeResult.includes("Fast-forward") || 
               mergeResult.includes("Updating") || 
               mergeResult.includes("files changed") ||
               mergeResult.includes("insertions") ||
               mergeResult.includes("deletions")) {
      status = "✅ updated";
      detailedMessage = `FETCH: ${fetchResult || 'N/A'}\nMERGE: ${mergeResult}`;
      notifier.notify({ title: "PullMate", message: `${repoName}: Branch ${branch} updated` });
    } else {
      // Default to up-to-date for other cases
      status = "✅ up-to-date";
      detailedMessage = `FETCH: ${fetchResult || 'No updates from remote'}\nMERGE: ${mergeResult}`;
    }
  } else {
    // No output usually means up to date
    status = "✅ up-to-date";
    detailedMessage = `FETCH: ${fetchResult || 'No updates from remote'}\nMERGE: No output (likely up to date)`;
  }

  return {
    repoPath: fullPath,
    repoName,
    branch: branch,
    status,
    message: detailedMessage || message,
    timestamp,
    fetchOutput: fetchResult || "",
    mergeOutput: mergeResult || ""
  };
}
