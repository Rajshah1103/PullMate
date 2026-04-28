import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import open from 'open';

const DEFAULT_FILENAME = '.pullmaterc.json';

function expandHome(p) {
    if (!p) return p;
    if (p.startsWith('~')) {
        return path.join(os.homedir(), p.slice(1));
    }
    return p;
}

export function getRepoPath(repo) {
    return typeof repo === 'string' ? repo : repo.path;
}

export function getRepoGroup(repo) {
    if (typeof repo === 'string') return null;
    return repo.group || null;
}

export function getDefaultConfig() {
    return {
        repos: [],
        schedules: {
            "morning": ["09:00", "10:30"],
            "evening": ["18:00", "19:30"]
        },
        options: {
            autoFetch: true,
            notify: true,
            logFile: path.join(os.homedir(), '.pullmate', 'logs.txt'),
            runOnStartup: true
        }
    };
}

export function getDefaultConfigPath() {
    return path.join(os.homedir(), DEFAULT_FILENAME);
}

export async function ensureConfigDirExists(filePath) {
    const dir = path.dirname(filePath);
    try {
        await fs.mkdir(dir, { recursive: true });
    } catch (err) {
        // directory already exists
    }
}

export async function initConfig() {
    const cfgPath = getDefaultConfigPath();
    try {
        await fs.access(cfgPath);
        return { path: cfgPath, created: false };
    } catch (err) {
        // does not exist, create it
    }
    const defaultConfig = getDefaultConfig();
    const json = JSON.stringify(defaultConfig, null, 2);
    try {
        await ensureConfigDirExists(cfgPath);
        await fs.writeFile(cfgPath, json, { encoding: 'utf-8', flag: 'wx' });
        console.log(`Config created at ${cfgPath}`);
        return { path: cfgPath, created: true };
    } catch (error) {
        console.error('Failed to create config file:', error.message);
        throw error;
    }
}

export async function getConfig() {
    const cfgPath = getDefaultConfigPath();
    try {
        const fileData = await fs.readFile(cfgPath, { encoding: 'utf-8' });
        const parsedFileData = JSON.parse(fileData);
        return { path: cfgPath, config: parsedFileData, exists: true };
    } catch (err) {
        if (err.code === 'ENOENT') {
            return { path: cfgPath, config: getDefaultConfig(), exists: false };
        }
        console.error('Failed to read config:', err.message);
        throw err;
    }
}

export async function saveConfig(configObj, { silent = false } = {}) {
    const cfgPath = getDefaultConfigPath();
    const json = JSON.stringify(configObj, null, 2);
    try {
        await ensureConfigDirExists(cfgPath);
        await fs.writeFile(cfgPath, json, { encoding: 'utf-8', flag: 'w' });
        if (!silent) console.log(`Config saved at ${cfgPath}`);
        return cfgPath;
    } catch (err) {
        console.error('Failed to save config:', err.message);
        throw err;
    }
}

export async function editConfig() {
    const cfgPath = getDefaultConfigPath();
    try {
        try {
            await fs.access(cfgPath);
        } catch {
            await saveConfig(getDefaultConfig(), { silent: true });
            console.log(`Created default config at ${cfgPath}`);
        }
        await open(cfgPath, { wait: false });
        console.log(`Opened config in default editor: ${cfgPath}`);
        return cfgPath;
    } catch (err) {
        console.error('Failed to open config file in editor:', err.message);
        throw err;
    }
}

export async function addRepo(repoPath, { group } = {}) {
    const { config } = await getConfig();
    const normalized = expandHome(repoPath);
    const exists = config.repos.some(r => expandHome(getRepoPath(r)) === normalized);
    if (exists) return false;
    const entry = group ? { path: repoPath, group } : repoPath;
    config.repos.push(entry);
    await saveConfig(config, { silent: true });
    return true;
}

export async function removeRepo(repoPath) {
    const { config } = await getConfig();
    const normalized = expandHome(repoPath);
    const before = config.repos.length;
    config.repos = config.repos.filter(r => expandHome(getRepoPath(r)) !== normalized);
    if (config.repos.length === before) return false;
    await saveConfig(config, { silent: true });
    return true;
}

export async function addSchedule(name, time) {
    const { config } = await getConfig();
    if (!config.schedules) config.schedules = {};
    const existing = config.schedules[name];
    if (existing) {
        const arr = Array.isArray(existing) ? existing : [existing];
        if (!arr.includes(time)) arr.push(time);
        config.schedules[name] = arr.length === 1 ? arr[0] : arr;
    } else {
        config.schedules[name] = time;
    }
    await saveConfig(config, { silent: true });
    return true;
}

export async function removeSchedule(name) {
    const { config } = await getConfig();
    if (!config.schedules || !(name in config.schedules)) return false;
    delete config.schedules[name];
    await saveConfig(config, { silent: true });
    return true;
}
