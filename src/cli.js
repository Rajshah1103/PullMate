#!/usr/bin/env node
import { initConfig, getConfig, editConfig } from "./configManager.js";
import { pullRepo } from "./gitHandler.js";
import { getLogger } from "./logger.js";
import { Scheduler } from "./scheduler.js";
import { StartupManager } from "./startupManager.js";
import { ErrorHandler } from "./errorHandler.js";
import os from "os";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// ----------- Logger helper ------------
function logMessage(message, logFilePath) {
  try {
    const logDir = path.dirname(logFilePath);
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    const time = new Date().toISOString();
    fs.appendFileSync(logFilePath, `[${time}] ${message}\n`);
  } catch (err) {
    console.error("⚠️ Failed to write log:", err.message);
  }
}

// Global instances
let logger;
let errorHandler;
let scheduler;
let startupManager;

// Initialize modules
function initializeModules(config) {
  logger = getLogger(config.options.logFile);
  errorHandler = new ErrorHandler(logger);
  scheduler = new Scheduler(logger);
  startupManager = new StartupManager(logger);
}

// ----------- Helper for startup registration ------------
async function setupStartup(logFile) {
  const configData = await getConfig();
  if (!configData.config.options.runOnStartup) return;

  try {
    await startupManager.setupStartup();
  } catch (err) {
    console.error("❌ Failed to register PullMate for startup:", err.message);
    logger.error("Startup registration failed", err);
  }
}

// ----------- Pull function ------------
async function pullAllRepos(config, logFile) {
  if (!config.repos || config.repos.length === 0) {
    console.log("⚠️ No repos configured. Use pullmate edit to configure.");
    logger.warn("No repos configured");
    return;
  }

  console.log("⏳ Pulling repos...");
  logger.info("Starting repo pull operation...");

  const results = config.repos.map((repoPath) => pullRepo(repoPath));
  const summary = { updated: 0, warnings: 0, failed: 0, upToDate: 0 };

  console.log(); // Empty line for better spacing

  results.forEach((r) => {
    const status = r.status || "";
    
    // Log detailed information for each repo (but not to console)
    logger.logRepoOperation('pull', r);
    
    // Update summary counts
    if (status.startsWith("✅") && status.includes("updated")) {
      summary.updated++;
    } else if (status.startsWith("✅") && status.includes("up-to-date")) {
      summary.upToDate++;
    } else if (status.startsWith("⚠️")) {
      summary.warnings++;
    } else if (status.startsWith("❌")) {
      summary.failed++;
    }
    
    // Clean console output - just the essential info
    const repoDisplayName = r.repoName || path.basename(r.repoPath);
    const branchInfo = r.branch ? ` (${r.branch})` : '';
    
    // Show branch updates summary if any
    let branchUpdateInfo = '';
    if (r.branchUpdates && r.branchUpdates.length > 0) {
      const otherUpdates = r.branchUpdates.filter(u => u.status === 'updated' && !u.isCurrent);
      const otherUpToDate = r.branchUpdates.filter(u => u.status === 'up-to-date' && !u.isCurrent);
      const totalOthers = otherUpdates.length + otherUpToDate.length;
      
      if (totalOthers > 0) {
        if (otherUpdates.length > 0 && otherUpToDate.length > 0) {
          branchUpdateInfo = ` + ${otherUpdates.length} updated, ${otherUpToDate.length} up-to-date`;
        } else if (otherUpdates.length > 0) {
          branchUpdateInfo = ` + ${otherUpdates.length} other branch(es) updated`;
        } else if (otherUpToDate.length > 0) {
          branchUpdateInfo = ` + ${otherUpToDate.length} other branch(es) up-to-date`;
        }
      }
    }
    
    console.log(`${status} ${repoDisplayName}${branchInfo}${branchUpdateInfo}`);
  });

  const summaryText = `✅ ${summary.updated} updated | 🔄 ${summary.upToDate} up-to-date | ⚠️ ${summary.warnings} warnings | ❌ ${summary.failed} failed`;
  console.log(`\n📊 Summary: ${summaryText}`);
  logger.logSummary(summary);
}

// ----------- OS-level schedule setup ------------
function setupSchedules(config, logFile) {
  try {
    scheduler.setupSchedules(config, config.schedules);
    console.log("⏰ OS-level schedules set up for:", JSON.stringify(config.schedules, null, 2));
  } catch (error) {
    console.error("❌ Failed to set up schedules:", error.message);
    logger.error("Schedule setup failed", error);
  }
}

// ----------- Command handlers ------------
function showHelp() {
  console.log(`
🚀 PullMate - Automated Git Repository Manager

Usage:
  pullmate             Run PullMate with current configuration
  pullmate edit        Open configuration editor  
  pullmate --help      Show this help information
  pullmate --version   Show version information

Examples:
  pullmate            # Pull all configured repos
  pullmate edit       # Configure repositories and schedules

For more information, visit: https://github.com/Rajshah1103/PullMate
`);
}

function showVersion() {
  const packageJsonPath = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  console.log(`PullMate v${packageJson.version}`);
}

// ----------- Main CLI flow ------------
async function main() {
  try {
    const arg = process.argv[2];
    
    // Handle commands that don't need config
    if (arg === "--help" || arg === "-h") {
      showHelp();
      return;
    }
    
    if (arg === "--version" || arg === "-v") {
      showVersion();
      return;
    }

    await initConfig();
    const { config } = await getConfig();
    const logFile = config.options.logFile || path.join(os.homedir(), ".pullmate", "logs.txt");

    // Initialize modules
    initializeModules(config);

    logger.logStartup('CLI');

    if (arg === "edit") {
      await editConfig();
      logger.info("Configuration edited");
      return;
    }

    await setupStartup(logFile);

    if (config.options.runOnStartup) {
      await pullAllRepos(config, logFile);
    }

    if (config.options.autoFetch && config.schedules) {
      setupSchedules(config, logFile);
    }

    console.log("✅ PullMate setup complete. Exiting CLI.");
    logger.info("CLI execution complete. Exiting.\n");
  } catch (error) {
    console.error("❌ PullMate encountered an error:", error.message);
    if (logger) {
      logger.error("CLI execution failed", error);
    }
    process.exit(1);
  }
}

// Run CLI
main().catch((err) => {
  console.error("❌ PullMate encountered an error:", err);
  process.exit(1);
});
