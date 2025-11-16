import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import open from 'open';

const DEFAULT_FILENAME = '.pullmaterc.json';

function expandHome(p) {
    if(!p) return p;
    if(p.startsWith('~')) {
        return path.join(os.homedir(), p.slice(1));
    }
    return p;
};

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
    }
};

export function getDefaultConfigPath () {
    return path.join(os.homedir(), DEFAULT_FILENAME);
};

export async function ensureConfigDirExists (filePath) {
    const dir = path.dirname(filePath);
    try {
        await fs.mkdir(dir, { recursive: true })
    } catch (err) {

    }
};

export async function initConfig () {
    const cfgPath = getDefaultConfigPath();
    try {
        await fs.access(cfgPath);
        console.log(`⚠️  Config already exists at ${cfgPath}`);
        return { path: cfgPath, created: false };
    } catch (err) {

    }
    const defaultConfig = getDefaultConfig();
    const json = JSON.stringify(defaultConfig, null, 2);

    try {
        await ensureConfigDirExists(cfgPath);
        await fs.writeFile(cfgPath, json, { encoding: 'utf-8', flag: 'wx'});
        console.log(`✅ Created default config at ${cfgPath}`);
        return { path: cfgPath, created: true };
    } catch (error) {
        console.error('❌ Failed to create config file:', err.message);
        throw error;
    }
};

export async function getConfig () {
    const cfgPath = getDefaultConfigPath();
    try {
        const fileData = await fs.readFile(cfgPath, { encoding: 'utf-8'});
        const parsedFileData = JSON.parse(fileData);
        return { path: cfgPath, config: parsedFileData, exists: true };
    } catch (err) {
        if (err.code === 'ENOENT') {
            return { path: cfgPath, config: getDefaultConfig(), exists: false };
        }
        console.error('❌ Failed to read config:', err.message);
        throw err;
    }
};

export async function saveConfig (configObj) {
    const cfgPath = getDefaultConfigPath();
    const json = JSON.stringify(configObj, null, 2);
    try {
        await ensureConfigDirExists(cfgPath);
        await fs.writeFile(cfgPath, json, { encoding: 'utf-8', flag: 'w'});
        console.log(`✅ Saved config at ${cfgPath}`);
        return cfgPath;
    } catch (err) {
        console.error('❌ Failed to save config:', err.message);
        throw err;
    }
}

export async function editConfig() {
  const cfgPath = getDefaultConfigPath();
  try {
    try {
      await fs.access(cfgPath);
    } catch {
      // create default config first
      await saveConfig(getDefaultConfig());
      console.log(`Created default config at ${cfgPath}`);
    }

    await open(cfgPath, { wait: false });
    console.log(`✏️  Opened config in default editor: ${cfgPath}`);
    return cfgPath;
  } catch (err) {
    console.error('❌ Failed to open config file in editor:', err.message);
    throw err;
  }
}