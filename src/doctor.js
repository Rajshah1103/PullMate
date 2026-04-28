import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { getConfig, getRepoPath } from './configManager.js';

function expandHome(p) {
  if (!p) return p;
  if (p.startsWith('~')) return path.join(os.homedir(), p.slice(1));
  return p;
}

function check(label, ok, detail = '') {
  const icon = ok ? '  ✅' : '  ❌';
  const suffix = detail ? `  ${detail}` : '';
  console.log(`${icon}  ${label}${suffix}`);
  return ok;
}

function warn(label, detail = '') {
  const suffix = detail ? `  ${detail}` : '';
  console.log(`  ⚠️  ${label}${suffix}`);
}

export async function runDoctor() {
  const { config, exists } = await getConfig();
  let issues = 0;

  console.log('\nPullMate Health Check\n');

  // --- Config ---
  console.log('Config\n');
  if (!check('Config file found', exists)) {
    console.log('        Run: pullmate init');
    issues++;
  }

  const repoCount = (config.repos || []).length;
  if (!check(`Repositories configured`, repoCount > 0, `(${repoCount})`)) {
    console.log('        Run: pullmate add <path>');
    issues++;
  }

  // --- Repos ---
  console.log('\nRepositories\n');

  for (const repo of (config.repos || [])) {
    const repoPath = expandHome(getRepoPath(repo));
    const label = repoPath.replace(os.homedir(), '~');

    if (!fs.existsSync(repoPath)) {
      check(label, false, 'path not found');
      issues++;
      continue;
    }

    if (!fs.existsSync(path.join(repoPath, '.git'))) {
      check(label, false, 'not a git repository');
      issues++;
      continue;
    }

    let remote = '';
    try {
      remote = execSync('git remote get-url origin', {
        cwd: repoPath, encoding: 'utf-8', stdio: 'pipe'
      }).trim();
    } catch {
      check(label, false, 'no remote origin configured');
      issues++;
      continue;
    }

    check(label, true, remote);
  }

  // --- Scheduling ---
  console.log('\nScheduling\n');

  const platform = process.platform;
  const home = os.homedir();

  if (platform === 'darwin') {
    const plist = path.join(home, 'Library/LaunchAgents/com.pullmate.plist');
    if (fs.existsSync(plist)) {
      check('Startup entry (launchd)', true, plist.replace(home, '~'));
    } else {
      warn('Startup entry not found — run pullmate to register');
    }

    const scheduleNames = Object.keys(config.schedules || {});
    for (const name of scheduleNames) {
      const times = config.schedules[name];
      const arr = Array.isArray(times) ? times : [times];
      arr.forEach((_, idx) => {
        const schedulePlist = path.join(home, `Library/LaunchAgents/com.pullmate.${name}${idx}.plist`);
        if (fs.existsSync(schedulePlist)) {
          check(`Schedule "${name}" (${arr[idx]})`, true);
        } else {
          warn(`Schedule "${name}" (${arr[idx]}) not registered at OS level`);
        }
      });
    }
  } else if (platform === 'linux') {
    const desktop = path.join(home, '.config/autostart/pullmate.desktop');
    if (fs.existsSync(desktop)) {
      check('Startup entry (autostart)', true, desktop.replace(home, '~'));
    } else {
      warn('Startup entry not found — run pullmate to register');
    }
  } else if (platform === 'win32') {
    const startupDir = path.join(process.env.APPDATA || '', 'Microsoft/Windows/Start Menu/Programs/Startup');
    const shortcut = path.join(startupDir, 'PullMate.lnk');
    if (fs.existsSync(shortcut)) {
      check('Startup entry (Windows)', true);
    } else {
      warn('Startup entry not found — run pullmate to register');
    }
  }

  const scheduleCount = Object.keys(config.schedules || {}).length;
  check(`Schedules in config`, scheduleCount > 0, `(${scheduleCount})`);

  // --- Options ---
  console.log('\nOptions\n');
  check('runOnStartup', config.options?.runOnStartup === true);
  check('autoFetch', config.options?.autoFetch === true);
  check('notifications', config.options?.notify === true);

  const logFile = expandHome(config.options?.logFile || path.join(home, '.pullmate', 'logs.txt'));
  const logDir = path.dirname(logFile);
  check('Log directory writable', (() => {
    try { fs.accessSync(logDir, fs.constants.W_OK); return true; } catch { return false; }
  })(), logFile.replace(home, '~'));

  // --- Summary ---
  console.log();
  if (issues === 0) {
    console.log('All checks passed.\n');
  } else {
    console.log(`${issues} issue(s) found. See above for details.\n`);
  }
}
