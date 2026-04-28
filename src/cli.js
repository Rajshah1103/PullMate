#!/usr/bin/env node
import { Command } from 'commander';
import {
  initConfig, getConfig, editConfig, saveConfig,
  addRepo, removeRepo, getRepoPath, getRepoGroup,
  addSchedule, removeSchedule
} from './configManager.js';
import { pullRepo, getRepoStatus } from './gitHandler.js';
import { getLogger } from './logger.js';
import { Scheduler } from './scheduler.js';
import { StartupManager } from './startupManager.js';
import { ErrorHandler } from './errorHandler.js';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const packageJson = require('../package.json');

// Global instances
let logger;
let errorHandler;
let scheduler;
let startupManager;

function initializeModules(config) {
  logger = getLogger(config.options.logFile);
  errorHandler = new ErrorHandler(logger);
  scheduler = new Scheduler(logger);
  startupManager = new StartupManager(logger);
}

async function setupStartup() {
  const { config } = await getConfig();
  if (!config.options.runOnStartup) return;
  try {
    await startupManager.setupStartup();
  } catch (err) {
    console.error('Failed to register PullMate for startup:', err.message);
    logger.error('Startup registration failed', err);
  }
}

async function pullAllRepos(config, { group } = {}) {
  let repos = config.repos || [];

  if (group) {
    repos = repos.filter(r => getRepoGroup(r) === group);
    if (repos.length === 0) {
      console.log(`No repos found in group: ${group}`);
      return;
    }
  }

  if (repos.length === 0) {
    console.log('No repos configured. Use: pullmate add <path>');
    logger.warn('No repos configured');
    return;
  }

  console.log('Pulling repos...');
  logger.info('Starting repo pull operation...');

  const globalHooks = config.options?.hooks || {};

  const results = repos.map(repo => {
    const repoPath = getRepoPath(repo);
    const repoHooks = typeof repo === 'object' ? (repo.hooks || {}) : {};
    return pullRepo(repoPath, { hooks: { ...globalHooks, ...repoHooks } });
  });

  const summary = { updated: 0, warnings: 0, failed: 0, upToDate: 0 };

  console.log();

  results.forEach(r => {
    const status = r.status || '';
    logger.logRepoOperation('pull', r);

    if (status.startsWith('✅') && status.includes('updated')) summary.updated++;
    else if (status.startsWith('✅') && status.includes('up-to-date')) summary.upToDate++;
    else if (status.startsWith('⚠️')) summary.warnings++;
    else if (status.startsWith('❌')) summary.failed++;

    const repoDisplayName = r.repoName || path.basename(r.repoPath);
    const branchInfo = r.branch ? ` (${r.branch})` : '';

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
        } else {
          branchUpdateInfo = ` + ${otherUpToDate.length} other branch(es) up-to-date`;
        }
      }
    }

    // Dirty repos get an actionable hint
    const hint = status.includes('dirty') ? ' — stash or commit to sync' : '';

    console.log(`${status} ${repoDisplayName}${branchInfo}${branchUpdateInfo}${hint}`);
  });

  const summaryText = `✅ ${summary.updated} updated | 🔄 ${summary.upToDate} up-to-date | ⚠️ ${summary.warnings} warnings | ❌ ${summary.failed} failed`;
  console.log(`\n📊 Summary: ${summaryText}`);
  logger.logSummary(summary);
}

function setupSchedules(config) {
  try {
    scheduler.setupSchedules(config, config.schedules);
    console.log('Schedules set up:', JSON.stringify(config.schedules));
  } catch (error) {
    console.error('Failed to set up schedules:', error.message);
    logger.error('Schedule setup failed', error);
  }
}

// ---- Command handlers ----

async function handleAdd(repoPath, options) {
  await initConfig();
  const { config } = await getConfig();
  initializeModules(config);
  const added = await addRepo(repoPath, { group: options.group });
  if (added) {
    console.log(`Added: ${repoPath}${options.group ? `  [${options.group}]` : ''}`);
  } else {
    console.log(`Already configured: ${repoPath}`);
  }
}

async function handleRemove(repoPath) {
  await initConfig();
  const { config } = await getConfig();
  initializeModules(config);
  const removed = await removeRepo(repoPath);
  if (removed) {
    console.log(`Removed: ${repoPath}`);
  } else {
    console.log(`Not found in config: ${repoPath}`);
  }
}

async function handleList() {
  await initConfig();
  const { config } = await getConfig();
  const repos = config.repos || [];
  if (repos.length === 0) {
    console.log('No repos configured. Use: pullmate add <path>');
    return;
  }
  console.log(`\nConfigured repositories (${repos.length}):\n`);
  repos.forEach(repo => {
    const p = getRepoPath(repo);
    const g = getRepoGroup(repo);
    console.log(`  ${p}${g ? `  [${g}]` : ''}`);
  });
  console.log();
}

async function handleStatus(repoPath, options) {
  await initConfig();
  const { config } = await getConfig();
  initializeModules(config);

  const repos = repoPath
    ? [repoPath]
    : (config.repos || []).map(r => getRepoPath(r));

  if (repos.length === 0) {
    console.log('No repos configured. Use: pullmate add <path>');
    return;
  }

  const doFetch = options.fetch !== false;
  console.log(doFetch ? 'Fetching remote state...\n' : 'Checking local state...\n');

  for (const rp of repos) {
    const s = getRepoStatus(rp, { fetch: doFetch });
    const branch = s.branch ? `(${s.branch})` : '';

    let statusLine;
    switch (s.status) {
      case 'up-to-date':  statusLine = '✅ up-to-date'; break;
      case 'behind':      statusLine = `⬇️  ${s.behind} commit(s) behind`; break;
      case 'ahead':       statusLine = `⬆️  ${s.ahead} commit(s) ahead`; break;
      case 'diverged':    statusLine = `⚠️  diverged (${s.behind} behind, ${s.ahead} ahead)`; break;
      case 'dirty':       statusLine = '⚠️  uncommitted changes'; break;
      case 'no-remote':   statusLine = '⚠️  no remote tracking branch'; break;
      case 'not-a-git-repo': statusLine = '❌ not a git repository'; break;
      default:            statusLine = `❓ ${s.status}`;
    }

    console.log(`  ${s.repoName} ${branch}  ${statusLine}`);
  }
  console.log();
}

async function handleLogs(options) {
  await initConfig();
  const { config } = await getConfig();
  const logFile = config.options?.logFile || path.join(os.homedir(), '.pullmate', 'logs.txt');

  if (!fs.existsSync(logFile)) {
    console.log('No log file found at:', logFile);
    return;
  }

  const n = parseInt(options.lines || '50', 10);
  const content = fs.readFileSync(logFile, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  const filtered = options.errors ? lines.filter(l => l.includes('ERROR') || l.includes('WARN')) : lines;
  const toShow = filtered.slice(-n);

  if (toShow.length === 0) {
    console.log('No log entries found.');
    return;
  }

  console.log(toShow.join('\n'));

  if (options.tail) {
    let size = fs.statSync(logFile).size;
    console.log('\nWatching for new entries... (Ctrl+C to stop)\n');

    fs.watchFile(logFile, { interval: 500 }, curr => {
      if (curr.size > size) {
        const fd = fs.openSync(logFile, 'r');
        const buf = Buffer.alloc(curr.size - size);
        fs.readSync(fd, buf, 0, buf.length, size);
        fs.closeSync(fd);
        size = curr.size;
        const newLines = buf.toString('utf-8').split('\n').filter(l => l.trim());
        const toDisplay = options.errors ? newLines.filter(l => l.includes('ERROR') || l.includes('WARN')) : newLines;
        toDisplay.forEach(l => console.log(l));
      }
    });

    process.stdin.resume();
    process.on('SIGINT', () => {
      fs.unwatchFile(logFile);
      process.exit(0);
    });
  }
}

async function handleInit() {
  const { runWizard } = await import('./setupWizard.js');
  await runWizard();
}

async function handleDoctor() {
  const { runDoctor } = await import('./doctor.js');
  await runDoctor();
}

async function handleEdit() {
  await initConfig();
  await editConfig();
}

async function handleScheduleList() {
  await initConfig();
  const { config } = await getConfig();
  const schedules = config.schedules || {};
  const names = Object.keys(schedules);
  if (names.length === 0) {
    console.log('No schedules configured.');
    return;
  }
  console.log('\nConfigured schedules:\n');
  names.forEach(name => {
    const times = schedules[name];
    const timeStr = Array.isArray(times) ? times.join(', ') : times;
    console.log(`  ${name}: ${timeStr}`);
  });
  console.log();
}

async function handleScheduleAdd(name, time) {
  await initConfig();
  const { config } = await getConfig();
  initializeModules(config);

  if (!/^\d{1,2}:\d{2}$/.test(time)) {
    console.error('Invalid time format. Use HH:MM (e.g. 09:00)');
    process.exit(1);
  }

  await addSchedule(name, time);

  const { config: updated } = await getConfig();
  try {
    scheduler.setupSchedules(updated, { [name]: time });
    console.log(`Schedule added: "${name}" at ${time}`);
  } catch (err) {
    console.log(`Schedule saved to config: "${name}" at ${time}`);
    console.log(`Note: OS-level schedule setup failed: ${err.message}`);
  }
}

async function handleScheduleRemove(name) {
  await initConfig();
  const { config } = await getConfig();
  initializeModules(config);
  const removed = await removeSchedule(name);
  if (removed) {
    console.log(`Schedule removed: "${name}"`);
  } else {
    console.log(`Schedule not found: "${name}"`);
  }
}

// ---- Main ----

async function main() {
  try {
    const program = new Command();

    program
      .name('pullmate')
      .description('Automated Git repository sync tool')
      .version(packageJson.version, '-v, --version', 'output version number')
      .helpOption('-h, --help', 'display help')
      .option('--group <name>', 'sync only repos in this group')
      .action(async options => {
        await initConfig();
        const { config } = await getConfig();
        initializeModules(config);
        logger.logStartup('CLI');

        await setupStartup();

        if (config.options.runOnStartup) {
          await pullAllRepos(config, { group: options.group });
        }

        if (config.options.autoFetch && config.schedules) {
          setupSchedules(config);
        }

        console.log('PullMate complete.');
        logger.info('CLI execution complete.\n');
      });

    program
      .command('add <path>')
      .description('add a repository to sync')
      .option('--group <name>', 'assign to a group')
      .action(handleAdd);

    program
      .command('remove <path>')
      .description('remove a repository from sync')
      .action(handleRemove);

    program
      .command('list')
      .description('list all configured repositories')
      .action(handleList);

    program
      .command('status [path]')
      .description('show repository status without pulling')
      .option('--no-fetch', 'use cached remote state (faster, may be stale)')
      .action(handleStatus);

    program
      .command('logs')
      .description('view sync logs')
      .option('-n, --lines <number>', 'number of lines to show', '50')
      .option('--tail', 'follow log output in real time')
      .option('--errors', 'show only error and warning lines')
      .action(handleLogs);

    program
      .command('init')
      .description('interactive setup wizard')
      .action(handleInit);

    program
      .command('doctor')
      .description('check configuration and repo health')
      .action(handleDoctor);

    program
      .command('edit')
      .description('open configuration file in default editor')
      .action(handleEdit);

    const scheduleCmd = program
      .command('schedule')
      .description('manage sync schedules');

    scheduleCmd
      .command('list')
      .description('list all configured schedules')
      .action(handleScheduleList);

    scheduleCmd
      .command('add <name> <time>')
      .description('add a schedule (time format: HH:MM)')
      .action(handleScheduleAdd);

    scheduleCmd
      .command('remove <name>')
      .description('remove a schedule by name')
      .action(handleScheduleRemove);

    await program.parseAsync(process.argv);

  } catch (error) {
    console.error('PullMate error:', error.message);
    if (logger) logger.error('CLI execution failed', error);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('PullMate error:', err);
  process.exit(1);
});
