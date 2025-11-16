// src/scheduler.js
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

export class Scheduler {
  constructor(logger) {
    this.logger = logger;
    this.platform = process.platform;
  }

  /**
   * Set up OS-level schedules for automatic pulls
   * @param {Object} config - PullMate configuration
   * @param {Object} schedules - Schedule configuration object
   */
  setupSchedules(config, schedules = {}) {
    if (!schedules || Object.keys(schedules).length === 0) {
      this.logger.info('No schedules configured, skipping schedule setup');
      return;
    }

    const cliPath = process.argv[1];
    const nodePath = process.execPath;

    Object.entries(schedules).forEach(([key, times]) => {
      const timeArray = Array.isArray(times) ? times : [times];
      
      timeArray.forEach((time, idx) => {
        const [hour, minute] = time.split(':');
        if (!hour || !minute || isNaN(hour) || isNaN(minute)) {
          this.logger.warn(`Invalid time format for schedule ${key}${idx}: ${time}`);
          return;
        }

        try {
          this._createScheduleForPlatform(key, idx, hour, minute, nodePath, cliPath);
        } catch (error) {
          this.logger.error(`Failed to create schedule ${key}${idx}`, error);
        }
      });
    });

    this.logger.logSchedule(schedules);
  }

  /**
   * Create platform-specific schedule
   */
  _createScheduleForPlatform(key, idx, hour, minute, nodePath, cliPath) {
    const scheduleId = `${key}${idx}`;
    
    switch (this.platform) {
      case 'darwin':
        this._setupMacOSSchedule(scheduleId, hour, minute, nodePath, cliPath);
        break;
      case 'linux':
        this._setupLinuxSchedule(scheduleId, hour, minute, cliPath);
        break;
      case 'win32':
        this._setupWindowsSchedule(scheduleId, hour, minute, cliPath);
        break;
      default:
        this.logger.warn(`Platform ${this.platform} not supported for scheduling`);
    }
  }

  /**
   * Set up macOS launchd schedule
   */
  _setupMacOSSchedule(scheduleId, hour, minute, nodePath, cliPath) {
    const labelName = `com.pullmate.${scheduleId}`;
    
    // Check if schedule already exists
    try {
      execSync(`launchctl print gui/$(id -u)/${labelName}`, { stdio: 'ignore' });
      this.logger.info(`Schedule ${scheduleId} already loaded`);
      return;
    } catch {
      // Schedule doesn't exist, create it
    }

    const plistDir = path.join(os.homedir(), 'Library/LaunchAgents');
    if (!fs.existsSync(plistDir)) {
      fs.mkdirSync(plistDir, { recursive: true });
    }

    const plistPath = path.join(plistDir, `${labelName}.plist`);
    const plistContent = this._generateMacOSPlist(labelName, hour, minute, nodePath, cliPath);
    
    fs.writeFileSync(plistPath, plistContent, 'utf-8');
    
    try {
      execSync(`launchctl load -w ${plistPath}`, { stdio: 'ignore' });
      this.logger.info(`macOS schedule created: ${scheduleId} (${hour}:${minute})`);
    } catch (error) {
      this.logger.error(`Failed to load macOS schedule ${scheduleId}`, error);
    }
  }

  /**
   * Set up Linux cron schedule
   */
  _setupLinuxSchedule(scheduleId, hour, minute, cliPath) {
    const cronComment = `pullmate-${scheduleId}`;
    const cronLine = `${parseInt(minute)} ${parseInt(hour)} * * * ${cliPath} # ${cronComment}`;
    
    try {
      const existingCrontab = execSync('crontab -l 2>/dev/null || true', { encoding: 'utf-8' });
      
      if (!existingCrontab.includes(cronComment)) {
        const newCrontab = existingCrontab + cronLine + '\n';
        const tempFile = `/tmp/pullmate-cron-${Date.now()}`;
        fs.writeFileSync(tempFile, newCrontab);
        execSync(`crontab ${tempFile}`);
        fs.unlinkSync(tempFile);
        this.logger.info(`Linux cron job added: ${scheduleId} (${hour}:${minute})`);
      } else {
        this.logger.info(`Cron job ${scheduleId} already exists`);
      }
    } catch (error) {
      this.logger.error(`Failed to add cron job ${scheduleId}`, error);
    }
  }

  /**
   * Set up Windows scheduled task
   */
  _setupWindowsSchedule(scheduleId, hour, minute, cliPath) {
    const taskName = `PullMate-${scheduleId}`;
    
    try {
      // Check if task already exists
      execSync(`schtasks /query /tn "${taskName}" >nul 2>&1`, { stdio: 'ignore' });
      this.logger.info(`Windows task ${scheduleId} already exists`);
    } catch {
      // Task doesn't exist, create it
      const command = `schtasks /create /tn "${taskName}" /tr "node \\"${cliPath}\\"" /sc daily /st ${hour}:${minute} /f`;
      
      try {
        execSync(command, { stdio: 'ignore' });
        this.logger.info(`Windows scheduled task created: ${scheduleId} (${hour}:${minute})`);
      } catch (error) {
        this.logger.error(`Failed to create Windows task ${scheduleId}`, error);
      }
    }
  }

  /**
   * Generate macOS plist content
   */
  _generateMacOSPlist(labelName, hour, minute, nodePath, cliPath) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>${labelName}</string>
    <key>ProgramArguments</key>
    <array>
      <string>${nodePath}</string>
      <string>${cliPath}</string>
    </array>
    <key>StartCalendarInterval</key>
    <dict>
      <key>Hour</key>
      <integer>${parseInt(hour)}</integer>
      <key>Minute</key>
      <integer>${parseInt(minute)}</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>/tmp/pullmate.out</string>
    <key>StandardErrorPath</key>
    <string>/tmp/pullmate.err</string>
  </dict>
</plist>`;
  }

  /**
   * Remove all PullMate schedules
   */
  removeAllSchedules() {
    try {
      switch (this.platform) {
        case 'darwin':
          this._removeMacOSSchedules();
          break;
        case 'linux':
          this._removeLinuxSchedules();
          break;
        case 'win32':
          this._removeWindowsSchedules();
          break;
      }
    } catch (error) {
      this.logger.error('Failed to remove schedules', error);
    }
  }

  /**
   * Remove macOS schedules
   */
  _removeMacOSSchedules() {
    const agentsDir = path.join(os.homedir(), 'Library/LaunchAgents');
    if (!fs.existsSync(agentsDir)) return;

    const files = fs.readdirSync(agentsDir);
    files.filter(file => file.startsWith('com.pullmate.'))
      .forEach(file => {
        try {
          const filePath = path.join(agentsDir, file);
          const labelName = file.replace('.plist', '');
          execSync(`launchctl unload -w ${filePath}`, { stdio: 'ignore' });
          fs.unlinkSync(filePath);
          this.logger.info(`Removed macOS schedule: ${labelName}`);
        } catch (error) {
          this.logger.warn(`Failed to remove macOS schedule ${file}`, error);
        }
      });
  }

  /**
   * Remove Linux cron jobs
   */
  _removeLinuxSchedules() {
    try {
      const existingCrontab = execSync('crontab -l 2>/dev/null || true', { encoding: 'utf-8' });
      const lines = existingCrontab.split('\n');
      const filteredLines = lines.filter(line => !line.includes('# pullmate-'));
      
      if (filteredLines.length !== lines.length) {
        const newCrontab = filteredLines.join('\n');
        const tempFile = `/tmp/pullmate-cron-cleanup-${Date.now()}`;
        fs.writeFileSync(tempFile, newCrontab);
        execSync(`crontab ${tempFile}`);
        fs.unlinkSync(tempFile);
        this.logger.info('Removed Linux cron jobs');
      }
    } catch (error) {
      this.logger.error('Failed to remove Linux schedules', error);
    }
  }

  /**
   * Remove Windows scheduled tasks
   */
  _removeWindowsSchedules() {
    try {
      const output = execSync('schtasks /query /fo csv | findstr "PullMate-"', { encoding: 'utf-8' });
      const lines = output.split('\n').filter(line => line.trim());
      
      lines.forEach(line => {
        const taskName = line.split(',')[0].replace(/"/g, '');
        if (taskName.startsWith('PullMate-')) {
          try {
            execSync(`schtasks /delete /tn "${taskName}" /f`, { stdio: 'ignore' });
            this.logger.info(`Removed Windows task: ${taskName}`);
          } catch (error) {
            this.logger.warn(`Failed to remove Windows task ${taskName}`, error);
          }
        }
      });
    } catch (error) {
      // No tasks found or other error
      this.logger.debug('No Windows scheduled tasks found to remove');
    }
  }
}
