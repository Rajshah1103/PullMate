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

// Update all local branches that have remote tracking branches
function updateAllLocalBranches(repoPath) {
  const fullPath = expandHome(repoPath);
  const currentBranch = getCurrentBranch(fullPath);
  
  // Get all local branches that have remote tracking branches
  const localBranchesResult = runGitCommand(fullPath, "git for-each-ref --format='%(refname:short) %(upstream:short)' refs/heads");
  
  if (localBranchesResult.error) {
    return { error: "Could not get local branches", details: localBranchesResult.error };
  }

  const branchUpdates = [];
  const lines = localBranchesResult.trim().split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    const [localBranch, remoteBranch] = line.trim().split(' ');
    
    // Skip if no remote tracking branch
    if (!remoteBranch) continue;
    
    if (localBranch === currentBranch) {
      // For current branch, check if it actually needs updating
      const localCommit = runGitCommand(fullPath, `git rev-parse HEAD`);
      const remoteCommit = runGitCommand(fullPath, `git rev-parse ${remoteBranch}`);
      
      if (!localCommit.error && !remoteCommit.error && localCommit.trim() === remoteCommit.trim()) {
        // Already up to date
        branchUpdates.push({
          branch: localBranch,
          status: 'up-to-date',
          message: 'already up-to-date',
          isCurrent: true
        });
      } else {
        // Try to merge
        const mergeResult = runGitCommand(fullPath, `git merge --ff-only ${remoteBranch}`);
        branchUpdates.push({
          branch: localBranch,
          status: mergeResult.error ? 'failed' : (mergeResult.includes('Already up to date') ? 'up-to-date' : 'updated'),
          message: mergeResult.error ? mergeResult.error : mergeResult || 'merged successfully',
          isCurrent: true
        });
      }
    } else {
      // For other branches, check if they need updating first
      const localCommit = runGitCommand(fullPath, `git rev-parse ${localBranch}`);
      const remoteCommit = runGitCommand(fullPath, `git rev-parse ${remoteBranch}`);
      
      if (localCommit.error || remoteCommit.error) {
        branchUpdates.push({
          branch: localBranch,
          status: 'failed',
          message: 'Could not compare commits',
          isCurrent: false
        });
        continue;
      }
      
      // If commits are the same, branch is already up-to-date
      if (localCommit.trim() === remoteCommit.trim()) {
        branchUpdates.push({
          branch: localBranch,
          status: 'up-to-date',
          message: 'already up-to-date',
          isCurrent: false
        });
        continue;
      }
      
      // Check if local branch has diverged from remote
      const mergeBaseResult = runGitCommand(fullPath, `git merge-base ${localBranch} ${remoteBranch}`);
      
      if (mergeBaseResult.error) {
        branchUpdates.push({
          branch: localBranch,
          status: 'failed',
          message: mergeBaseResult.error,
          isCurrent: false
        });
        continue;
      }
      
      if (mergeBaseResult.trim() === localCommit.trim()) {
        // Local branch is behind, safe to update
        const updateResult = runGitCommand(fullPath, `git update-ref refs/heads/${localBranch} ${remoteBranch}`);
        branchUpdates.push({
          branch: localBranch,
          status: updateResult.error ? 'failed' : 'updated',
          message: updateResult.error ? updateResult.error : 'fast-forwarded',
          isCurrent: false
        });
      } else if (mergeBaseResult.trim() === remoteCommit.trim()) {
        // Remote is behind local (shouldn't happen normally, but just in case)
        branchUpdates.push({
          branch: localBranch,
          status: 'up-to-date',
          message: 'local ahead of remote',
          isCurrent: false
        });
      } else {
        // Local branch has diverged, don't update automatically
        branchUpdates.push({
          branch: localBranch,
          status: 'diverged',
          message: 'Local branch has diverged from remote',
          isCurrent: false
        });
      }
    }
  }
  
  return { branchUpdates };
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
  const fetchResult = runGitCommand(fullPath, "git fetch --all");
  
  // Update all local branches that have remote counterparts
  const updateAllBranchesResult = updateAllLocalBranches(fullPath);
  
  // The current branch should already be updated, but let's verify the merge result for status
  const mergeResult = runGitCommand(fullPath, `git merge --ff-only origin/${branch}`);

  let status = "🔄 up-to-date";
  let message = mergeResult;
  let detailedMessage = "";
  let branchUpdateSummary = "";

  // Process branch updates summary
  if (updateAllBranchesResult && updateAllBranchesResult.branchUpdates) {
    const updates = updateAllBranchesResult.branchUpdates;
    const updatedBranches = updates.filter(u => u.status === 'updated' && !u.isCurrent);
    const upToDateBranches = updates.filter(u => u.status === 'up-to-date' && !u.isCurrent);
    const divergedBranches = updates.filter(u => u.status === 'diverged');
    const failedBranches = updates.filter(u => u.status === 'failed' && !u.isCurrent);
    
    const summaryParts = [];
    if (updatedBranches.length > 0) {
      summaryParts.push(`${updatedBranches.length} branch(es) updated: ${updatedBranches.map(b => b.branch).join(', ')}`);
    }
    if (upToDateBranches.length > 0) {
      summaryParts.push(`${upToDateBranches.length} branch(es) up-to-date`);
    }
    if (divergedBranches.length > 0) {
      summaryParts.push(`${divergedBranches.length} branch(es) diverged: ${divergedBranches.map(b => b.branch).join(', ')}`);
    }
    if (failedBranches.length > 0) {
      summaryParts.push(`${failedBranches.length} branch(es) failed: ${failedBranches.map(b => b.branch).join(', ')}`);
    }
    
    branchUpdateSummary = summaryParts.length > 0 ? '\nOther branches: ' + summaryParts.join('; ') : '';
  }

  // Determine if we had any updates (current branch or other branches)
  const hasUpdates = updateAllBranchesResult?.branchUpdates?.some(u => u.status === 'updated') || false;
  const fetchMessage = hasUpdates ? 'Updates fetched from remote' : 'No updates from remote';

  if (mergeResult && mergeResult.error) {
    status = "❌ failed";
    message = mergeResult.error;
    detailedMessage = `FETCH: ${fetchResult || 'N/A'}\nMERGE ERROR: ${mergeResult.error}${branchUpdateSummary}`;

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
    
    const isCurrentBranchUpToDate = upToDateMessages.some(msg => 
      mergeResult.toLowerCase().includes(msg.toLowerCase())
    );
    
    const currentBranchWasUpdated = mergeResult.includes("Fast-forward") || 
               mergeResult.includes("Updating") || 
               mergeResult.includes("files changed") ||
               mergeResult.includes("insertions") ||
               mergeResult.includes("deletions");
    
    // If current branch was updated OR other branches were updated, show "updated"
    if (currentBranchWasUpdated || hasUpdates) {
      status = "✅ updated";
      detailedMessage = `FETCH: ${fetchMessage}\nMERGE: ${mergeResult}${branchUpdateSummary}`;
      notifier.notify({ title: "PullMate", message: `${repoName}: Repository updated` });
    } else if (isCurrentBranchUpToDate) {
      status = "✅ up-to-date";
      detailedMessage = `FETCH: ${fetchMessage}\nMERGE: ${mergeResult}${branchUpdateSummary}`;
    } else {
      // Default to up-to-date for other cases
      status = "✅ up-to-date";
      detailedMessage = `FETCH: ${fetchMessage}\nMERGE: ${mergeResult}${branchUpdateSummary}`;
    }
  } else {
    // No output usually means up to date, but check if other branches were updated
    if (hasUpdates) {
      status = "✅ updated";
      detailedMessage = `FETCH: ${fetchMessage}\nMERGE: No output (current branch up to date)${branchUpdateSummary}`;
    } else {
      status = "✅ up-to-date";
      detailedMessage = `FETCH: ${fetchMessage}\nMERGE: No output (likely up to date)${branchUpdateSummary}`;
    }
  }

  return {
    repoPath: fullPath,
    repoName,
    branch: branch,
    status,
    message: detailedMessage || message,
    timestamp,
    fetchOutput: fetchResult || "",
    mergeOutput: mergeResult || "",
    branchUpdates: updateAllBranchesResult?.branchUpdates || []
  };
}
