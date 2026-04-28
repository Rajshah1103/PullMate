import readline from 'readline';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { getConfig, saveConfig, getDefaultConfig, getRepoPath } from './configManager.js';

function expandHome(p) {
  if (!p) return p;
  if (p.startsWith('~')) return path.join(os.homedir(), p.slice(1));
  return p;
}

function shrinkHome(p) {
  return p.replace(os.homedir(), '~');
}

function prompt(rl, question) {
  return new Promise(resolve => rl.question(question, resolve));
}

function scanForRepos(dir, maxDepth = 2) {
  const results = [];
  function walk(current, depth) {
    if (depth > maxDepth) return;
    if (fs.existsSync(path.join(current, '.git'))) {
      results.push(current);
      return;
    }
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        walk(path.join(current, entry.name), depth + 1);
      }
    }
  }
  walk(dir, 0);
  return results;
}

export async function runWizard() {
  const home = os.homedir();
  const searchDirs = ['projects', 'code', 'dev', 'src', 'workspace', 'work']
    .map(d => path.join(home, d))
    .filter(d => fs.existsSync(d));

  console.log('\nPullMate Setup Wizard\n');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  try {
    let { config, exists } = await getConfig();
    if (!exists) config = getDefaultConfig();

    // ---- Repos ----
    console.log('Scanning for git repositories...\n');
    const found = [];
    for (const d of searchDirs) found.push(...scanForRepos(d));
    // Also scan home dir immediate subdirectories
    found.push(...scanForRepos(home, 1));

    const uniqueFound = [...new Set(found)];
    const existingPaths = config.repos.map(r => expandHome(getRepoPath(r)));
    const newRepos = uniqueFound.filter(r => !existingPaths.includes(r));

    if (newRepos.length === 0) {
      console.log('No new repositories found in common locations.');
      console.log('You can add repos manually: pullmate add <path>\n');
    } else {
      console.log(`Found ${newRepos.length} repositor${newRepos.length === 1 ? 'y' : 'ies'}:\n`);
      newRepos.forEach((r, i) => console.log(`  ${i + 1}. ${shrinkHome(r)}`));

      const answer = await prompt(rl, '\nEnter numbers to add (comma-separated, or "all", or Enter to skip): ');

      let toAdd = [];
      const trimmed = answer.trim().toLowerCase();
      if (trimmed === 'all') {
        toAdd = newRepos;
      } else if (trimmed) {
        const indices = trimmed.split(',')
          .map(s => parseInt(s.trim(), 10) - 1)
          .filter(i => i >= 0 && i < newRepos.length);
        toAdd = indices.map(i => newRepos[i]);
      }

      for (const r of toAdd) config.repos.push(r);
      if (toAdd.length > 0) console.log(`\nAdded ${toAdd.length} repositor${toAdd.length === 1 ? 'y' : 'ies'}.`);
    }

    // ---- Schedules ----
    const doSchedules = await prompt(rl, '\nConfigure sync schedules? (Y/n): ');
    if (doSchedules.trim().toLowerCase() !== 'n') {
      if (!config.schedules) config.schedules = {};
      let addMore = true;
      while (addMore) {
        const name = (await prompt(rl, 'Schedule name (e.g. morning, or Enter to finish): ')).trim();
        if (!name) break;
        const time = (await prompt(rl, 'Time (HH:MM): ')).trim();
        if (/^\d{1,2}:\d{2}$/.test(time)) {
          config.schedules[name] = time;
          console.log(`  Added schedule "${name}" at ${time}`);
        } else {
          console.log('  Invalid time format, skipping.');
        }
        const another = await prompt(rl, 'Add another schedule? (y/N): ');
        addMore = another.trim().toLowerCase() === 'y';
      }
    }

    // ---- Options ----
    const notify = await prompt(rl, '\nEnable desktop notifications? (Y/n): ');
    config.options.notify = notify.trim().toLowerCase() !== 'n';

    const startup = await prompt(rl, 'Run on system startup? (Y/n): ');
    config.options.runOnStartup = startup.trim().toLowerCase() !== 'n';

    // ---- Save ----
    await saveConfig(config, { silent: true });
    console.log('\nSetup complete. Config saved.');
    console.log("Run 'pullmate' to sync your repos now.\n");

  } finally {
    rl.close();
  }
}
