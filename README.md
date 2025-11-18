# 🚀 PullMate

[![npm version](https://img.shields.io/npm/v/pullmate.svg)](https://www.npmjs.com/package/pullmate)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub issues](https://img.shields.io/github/issues/Rajshah1103/PullMate.svg)](https://github.com/Rajshah1103/PullMate/issues)
[![GitHub stars](https://img.shields.io/github/stars/Rajshah1103/PullMate.svg)](https://github.com/Rajshah1103/PullMate/stargazers)

> Automatically pull your git repositories every morning or on laptop startup ☕

PullMate is a cross-platform CLI tool that automatically keeps your git repositories up-to-date by pulling changes on startup and/or at scheduled times. Never miss important updates from your team again!

## ✨ Features

- 🔄 **Auto-pull on startup**: Automatically pull all configured repositories when your system starts
- 🌿 **All-branch sync**: Updates ALL local branches with their remote counterparts (v1.1.0+)
- ⏰ **Scheduled pulls**: Set up custom schedules with any names you want (morning, workday, hourly, etc.)
- 🎯 **Smart status detection**: Accurate reporting of what actually got updated vs what was already current
- 📊 **Detailed logging**: Complete operation logs with timestamps, branch info, and automatic rotation
- 🔔 **Desktop notifications**: Get notified when repositories are updated or encounter issues
- 🛡️ **Safe operations**: Only fast-forward pulls, warns about uncommitted changes and merge conflicts
- 🌐 **Cross-platform**: Works on macOS, Linux, and Windows
- 📁 **Multi-repo support**: Manage multiple repositories from a single configuration
- 🧠 **Intelligent updates**: No more false "updated" reports - only shows updates when commits actually change

## 📦 Installation

### Global Installation (Recommended)
```bash
npm install -g pullmate
```

### Local Installation
```bash
npm install pullmate
npx pullmate
```

### Docker Installation
```bash
# Option 1: Pull from Docker Hub (once published)
docker pull rajshah1103/pullmate:latest

# Option 2: Build from source
git clone https://github.com/Rajshah1103/PullMate.git
cd PullMate
docker build -t pullmate .
```

## 🚀 Quick Start

### NPM Installation
1. **Install PullMate globally:**
   ```bash
   npm install -g pullmate
   ```

2. **Configure your repositories:**
   ```bash
   pullmate edit
   ```

3. **Run PullMate:**
   ```bash
   pullmate
   ```

### Docker Installation
1. **Pull and run with Docker:**
   ```bash
   # Pull the image
   docker pull rajshah1103/pullmate:latest
   
   # Create config (one-time setup)
   docker run -it -v ~/.pullmaterc.json:/home/pullmate/.pullmaterc.json rajshah1103/pullmate:latest edit
   
   # Run PullMate
   docker run --rm \
     -v /path/to/your/repos:/repos \
     -v ~/.pullmaterc.json:/home/pullmate/.pullmaterc.json \
     rajshah1103/pullmate:latest
   ```

## ⚙️ Configuration

PullMate stores its configuration in `~/.pullmaterc.json`. Here's an example:

```json
{
  "repos": [
    "/Users/username/projects/my-app",
    "/Users/username/projects/another-repo",
    "~/development/open-source-project"
  ],
  "options": {
    "runOnStartup": true,
    "autoFetch": true,
    "logFile": "~/.pullmate/logs.txt"
  },
  "schedules": {
    "morning": "09:00",
    "evening": "18:00"
  }
}
```

### Configuration Options

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `repos` | Array | List of repository paths to manage | `[]` |
| `runOnStartup` | Boolean | Pull repositories on system startup | `true` |
| `autoFetch` | Boolean | Enable scheduled pulls | `true` |
| `logFile` | String | Path to log file | `~/.pullmate/logs.txt` |
| `schedules` | Object | Custom named schedules with times (any names allowed) | `{}` |

**Important:** Schedule names are completely flexible - use any names you prefer!

### Schedule Format

Schedules use 24-hour format (HH:MM) and support **any custom schedule names** - you're not limited to "morning" and "evening":
```json
{
  "schedules": {
    "morning": "09:00",                    // Single time
    "lunch": "13:00",                      // Any custom name
    "afternoon": "14:00",                  // Any custom name  
    "evening": ["18:00", "21:00"],         // Multiple times  
    "workday": ["09:00", "12:00", "17:00"], // Multiple times
    "hourly": ["10:00", "11:00", "12:00", "13:00", "14:00"] // Many times
  }
}
```

**Key Points:**
- ✅ **Flexible naming**: Use any schedule names you want (`work`, `break`, `sync`, etc.)
- ✅ **Single or multiple times**: Each schedule can have one time `"09:00"` or multiple `["09:00", "17:00"]`
- ✅ **Cross-platform**: Works on macOS (launchd), Linux (cron), and Windows (Task Scheduler)

## 🐳 Docker Usage

### Option 1: Use Published Image
```bash
# Pull the official image
docker pull rajshah1103/pullmate:latest

# Run with mounted repositories and config
docker run --rm \
  -v /path/to/your/repos:/repos \
  -v ~/.pullmaterc.json:/home/pullmate/.pullmaterc.json \
  -v ~/.pullmate:/home/pullmate/.pullmate \
  rajshah1103/pullmate:latest

# Run interactively to configure
docker run -it \
  -v ~/.pullmaterc.json:/home/pullmate/.pullmaterc.json \
  rajshah1103/pullmate:latest edit
```

### Option 2: Build from Source
```bash
# Clone and build
git clone https://github.com/Rajshah1103/PullMate.git
cd PullMate
docker build -t pullmate .

# Run with mounted repositories
docker run --rm \
  -v /path/to/your/repos:/repos \
  -v ~/.pullmaterc.json:/home/pullmate/.pullmaterc.json \
  pullmate
```

### Docker Compose (Scheduled Runs)
```yaml
version: '3.8'
services:
  pullmate:
    image: rajshah1103/pullmate:latest
    # OR for local build: build: .
    volumes:
      - /path/to/your/repos:/repos
      - ~/.pullmaterc.json:/home/pullmate/.pullmaterc.json
      - ~/.pullmate:/home/pullmate/.pullmate
    environment:
      - TZ=America/New_York
    restart: unless-stopped
    # Run every 6 hours
    deploy:
      restart_policy:
        condition: any
        delay: 21600s  # 6 hours
```

### Docker Environment Variables
- `NODE_ENV`: Set to `production` (default in container)
- `TZ`: Set your timezone for proper scheduling
- `HOME`: User home directory (set to `/home/pullmate` in container)

## 📋 Commands

| Command | Description |
|---------|-------------|
| `pullmate` | Run PullMate with current configuration |
| `pullmate edit` | Open configuration editor |
| `pullmate --help` or `-h` | Show help information |
| `pullmate --version` or `-v` | Show version information |

## 📊 Status Indicators

PullMate provides clear status indicators for each repository:

- ✅ **up-to-date**: Repository is current, no changes pulled
- ✅ **updated**: New commits were pulled successfully (current branch or other branches)
- ⚠️ **dirty**: Repository has uncommitted changes
- ⚠️ **diverged**: Local branch has diverged from remote
- ❌ **failed**: Operation failed (network issues, etc.)
- ❌ **not-a-git-repo**: Directory is not a git repository

### 🌿 Branch Status (v1.1.0+)
PullMate now shows detailed information about other branches:
```bash
✅ updated my-repo (main) + 3 other branch(es) updated
✅ up-to-date my-repo (dev) + 2 other branch(es) up-to-date
```

This means even if your current branch is up-to-date, you'll know if other local branches (like `master`, `develop`, etc.) were updated with new commits from their remotes.

## 🔧 Platform-Specific Setup

### macOS
PullMate automatically registers with `launchd` for startup execution:
```bash
# Service location
~/Library/LaunchAgents/com.pullmate.plist
```

### Linux
Registers with systemd or cron depending on your system:
```bash
# Desktop entry location
~/.config/autostart/pullmate.desktop

# Or cron job
crontab -l | grep pullmate
```

### Windows
Creates a startup shortcut:
```bash
# Startup folder location
%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\PullMate.lnk
```

## 📝 Logging

PullMate maintains detailed logs of all operations:

```
[2025-11-07T11:15:06.284Z] 🚀 PullMate CLI started
[2025-11-07T11:15:21.817Z] 📁 Repo: my-project (/Users/username/projects/my-project)
🌿 Branch: main
📊 Status: ✅ up-to-date
⏰ Time: 2025-11-07T11:15:06.284Z
📝 Details: FETCH: No updates from remote
PULL: Already up to date.
---
```

### Log Management & Rotation
PullMate uses **Winston logging library** with automatic rotation:

**📁 Log Files:**
- **Main logs**: `~/.pullmate/logs.txt` (operations, status, summaries)
- **Exception logs**: `~/.pullmate/exceptions.log` (crashes)  
- **Rejection logs**: `~/.pullmate/rejections.log` (promise rejections)

**🔄 Auto-Rotation:**
- **File Size Limit**: 10MB per log file
- **Archive Count**: Up to 5 rotated files (logs.txt.1, logs.txt.2, etc.)
- **Auto-cleanup**: Old logs automatically deleted to prevent disk bloat
- **Tailable**: New logs append to current file, old content archived

**📊 Log Retention:**
```bash
~/.pullmate/logs.txt      # Current logs (up to 10MB)
~/.pullmate/logs.txt.1    # Previous rotation  
~/.pullmate/logs.txt.2    # Older rotation
# ... up to logs.txt.5
```

## 🛠️ Development

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Git

### Setup
```bash
# Clone the repository
git clone https://github.com/Rajshah1103/PullMate.git
cd PullMate

# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Project Structure
```
PullMate/
├── bin/
│   └── index.js          # CLI entry point
├── src/
│   ├── cli.js            # Main CLI logic
│   ├── configManager.js  # Configuration management
│   ├── gitHandler.js     # Git operations
│   ├── logger.js         # Logging utilities
│   └── scheduler.js      # Schedule management
├── scripts/
│   └── tests.js          # Test scripts
├── Dockerfile            # Docker configuration
├── package.json
└── README.md
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test suite
npm run test:unit
npm run test:integration

# Run with coverage
npm run test:coverage
```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass
- Follow semantic versioning for releases

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Issues & Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/Rajshah1103/PullMate/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/Rajshah1103/PullMate/discussions)
- 📧 **Support**: [Email Support](mailto:rajshah11112003@gmail.com)

## 📊 Changelog

For detailed version history, see [CHANGELOG.md](./CHANGELOG.md).

### Latest Release: v1.1.0
- 🌿 **All-branch synchronization**: Updates ALL local branches with their remote counterparts
- 🎯 **Smart status detection**: Accurate "updated" vs "up-to-date" reporting
- 🧠 **Intelligent commit comparison**: No more false "updated" reports
- � **Clean CLI output**: Streamlined console display with better formatting
- 📊 **Enhanced branch reporting**: Shows which other branches were updated

[View Full Changelog →](./CHANGELOG.md)

## 🙏 Acknowledgments

- Thanks to all contributors who have helped improve PullMate
- Inspired by the need to keep development environments in sync
- Built with love for developers who manage multiple repositories

---

**Made with ❤️ by [Raj Shah](https://github.com/Rajshah1103) and contributors**
