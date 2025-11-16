// src/startupManager.js
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

export class StartupManager {
  constructor(logger) {
    this.logger = logger;
    this.platform = process.platform;
    this.home = os.homedir();
  }

  /**
   * Set up PullMate to run on system startup
   */
  async setupStartup() {
    try {
      const cliPath = process.argv[1];
      const nodePath = process.execPath;

      switch (this.platform) {
        case 'darwin':
          await this._setupMacOSStartup(cliPath, nodePath);
          break;
        case 'linux':
          await this._setupLinuxStartup(cliPath);
          break;
        case 'win32':
          await this._setupWindowsStartup(cliPath);
          break;
        default:
          this.logger.warn(`Platform ${this.platform} not supported for startup registration`);
          return;
      }

      this.logger.info('PullMate startup registration complete');
    } catch (error) {
      this.logger.error('Failed to register PullMate for startup', error);
      throw error;
    }
  }

  /**
   * Set up macOS startup using launchd
   */
  async _setupMacOSStartup(cliPath, nodePath) {
    const labelName = 'com.pullmate';
    
    // Check if already loaded
    try {
      execSync(`launchctl print gui/$(id -u)/${labelName}`, { stdio: 'ignore' });
      this.logger.info('PullMate startup service already loaded');
      return;
    } catch {
      // Service not loaded, continue with setup
    }

    const plistDir = path.join(this.home, 'Library/LaunchAgents');
    if (!fs.existsSync(plistDir)) {
      fs.mkdirSync(plistDir, { recursive: true });
    }

    const plistPath = path.join(plistDir, `${labelName}.plist`);
    const plistContent = this._generateMacOSStartupPlist(labelName, cliPath, nodePath);
    
    fs.writeFileSync(plistPath, plistContent, 'utf-8');

    try {
      execSync(`launchctl bootstrap gui/$(id -u) ${plistPath}`, { stdio: 'ignore' });
    } catch {
      // Fallback to legacy load command
      execSync(`launchctl load -w ${plistPath}`, { stdio: 'ignore' });
    }

    this.logger.info('macOS startup registration complete');
  }

  /**
   * Set up Linux startup using desktop entry
   */
  async _setupLinuxStartup(cliPath) {
    // Create shell wrapper for proper environment
    const wrapperPath = await this._createLinuxWrapper(cliPath);
    
    const autostartDir = path.join(this.home, '.config', 'autostart');
    if (!fs.existsSync(autostartDir)) {
      fs.mkdirSync(autostartDir, { recursive: true });
    }

    const desktopPath = path.join(autostartDir, 'pullmate.desktop');
    const desktopContent = this._generateLinuxDesktopEntry(wrapperPath);
    
    fs.writeFileSync(desktopPath, desktopContent, 'utf-8');
    this.logger.info('Linux startup registration complete');
  }

  /**
   * Set up Windows startup using startup folder shortcut
   */
  async _setupWindowsStartup(cliPath) {
    const startupDir = path.join(
      process.env.APPDATA,
      'Microsoft\\Windows\\Start Menu\\Programs\\Startup'
    );
    
    const shortcutPath = path.join(startupDir, 'PullMate.lnk');
    
    if (!fs.existsSync(shortcutPath)) {
      const psScript = `
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut('${shortcutPath}')
$Shortcut.TargetPath = '${cliPath}'
$Shortcut.WorkingDirectory = '${path.dirname(cliPath)}'
$Shortcut.Description = 'PullMate - Automatic Git Repository Updater'
$Shortcut.Save()
      `;
      
      execSync(`powershell -Command "${psScript.replace(/\n/g, '; ')}"`, { stdio: 'ignore' });
    }

    this.logger.info('Windows startup registration complete');
  }

  /**
   * Create Linux shell wrapper for proper environment loading
   */
  async _createLinuxWrapper(cliPath) {
    const wrapperPath = path.join(this.home, '.pullmate', 'pullmate-startup.sh');
    const wrapperDir = path.dirname(wrapperPath);
    
    if (!fs.existsSync(wrapperDir)) {
      fs.mkdirSync(wrapperDir, { recursive: true });
    }

    const wrapperContent = `#!/bin/bash
# PullMate startup wrapper

# Load NVM if available
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \\. "$NVM_DIR/nvm.sh"

# Load RVM if available
[[ -s "$HOME/.rvm/scripts/rvm" ]] && source "$HOME/.rvm/scripts/rvm"

# Set PATH for common Node.js installations
export PATH="$PATH:/usr/local/bin:$HOME/.local/bin:$HOME/bin"

# Change to home directory
cd "$HOME"

# Execute PullMate
exec "${cliPath}" 2>&1 | logger -t pullmate
`;

    fs.writeFileSync(wrapperPath, wrapperContent, 'utf-8');
    fs.chmodSync(wrapperPath, 0o755);
    
    return wrapperPath;
  }

  /**
   * Generate macOS plist content for startup
   */
  _generateMacOSStartupPlist(labelName, cliPath, nodePath) {
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
    <key>RunAtLoad</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/pullmate-startup.out</string>
    <key>StandardErrorPath</key>
    <string>/tmp/pullmate-startup.err</string>
    <key>EnvironmentVariables</key>
    <dict>
      <key>PATH</key>
      <string>/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin</string>
    </dict>
  </dict>
</plist>`;
  }

  /**
   * Generate Linux desktop entry content
   */
  _generateLinuxDesktopEntry(wrapperPath) {
    return `[Desktop Entry]
Type=Application
Exec=${wrapperPath}
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
Name=PullMate
Comment=Automatic Git pull on startup
Categories=Development;
Keywords=git;pull;automation;
Icon=git
StartupNotify=false
Terminal=false
`;
  }

  /**
   * Remove startup registration
   */
  async removeStartup() {
    try {
      switch (this.platform) {
        case 'darwin':
          await this._removeMacOSStartup();
          break;
        case 'linux':
          await this._removeLinuxStartup();
          break;
        case 'win32':
          await this._removeWindowsStartup();
          break;
      }
      
      this.logger.info('PullMate startup registration removed');
    } catch (error) {
      this.logger.error('Failed to remove startup registration', error);
      throw error;
    }
  }

  /**
   * Remove macOS startup configuration
   */
  async _removeMacOSStartup() {
    const labelName = 'com.pullmate';
    const plistPath = path.join(this.home, 'Library/LaunchAgents', `${labelName}.plist`);
    
    try {
      execSync(`launchctl bootout gui/$(id -u)/${labelName}`, { stdio: 'ignore' });
    } catch {
      try {
        execSync(`launchctl unload -w ${plistPath}`, { stdio: 'ignore' });
      } catch {
        // Service might not be loaded
      }
    }
    
    if (fs.existsSync(plistPath)) {
      fs.unlinkSync(plistPath);
    }
  }

  /**
   * Remove Linux startup configuration
   */
  async _removeLinuxStartup() {
    const desktopPath = path.join(this.home, '.config', 'autostart', 'pullmate.desktop');
    const wrapperPath = path.join(this.home, '.pullmate', 'pullmate-startup.sh');
    
    if (fs.existsSync(desktopPath)) {
      fs.unlinkSync(desktopPath);
    }
    
    if (fs.existsSync(wrapperPath)) {
      fs.unlinkSync(wrapperPath);
    }
  }

  /**
   * Remove Windows startup configuration
   */
  async _removeWindowsStartup() {
    const shortcutPath = path.join(
      process.env.APPDATA,
      'Microsoft\\Windows\\Start Menu\\Programs\\Startup',
      'PullMate.lnk'
    );
    
    if (fs.existsSync(shortcutPath)) {
      fs.unlinkSync(shortcutPath);
    }
  }

  /**
   * Check if startup is currently configured
   */
  isStartupConfigured() {
    switch (this.platform) {
      case 'darwin':
        return this._isMacOSStartupConfigured();
      case 'linux':
        return this._isLinuxStartupConfigured();
      case 'win32':
        return this._isWindowsStartupConfigured();
      default:
        return false;
    }
  }

  _isMacOSStartupConfigured() {
    try {
      execSync('launchctl print gui/$(id -u)/com.pullmate', { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  _isLinuxStartupConfigured() {
    const desktopPath = path.join(this.home, '.config', 'autostart', 'pullmate.desktop');
    return fs.existsSync(desktopPath);
  }

  _isWindowsStartupConfigured() {
    const shortcutPath = path.join(
      process.env.APPDATA,
      'Microsoft\\Windows\\Start Menu\\Programs\\Startup',
      'PullMate.lnk'
    );
    return fs.existsSync(shortcutPath);
  }
}
