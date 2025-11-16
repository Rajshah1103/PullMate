# 🚀 PullMate

[![npm version](https://badge.fury.io/js/pullmate.svg)](https://badge.fury.io/js/pullmate)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub issues](https://img.shields.io/github/issues/Rajshah1103/PullMate.svg)](https://github.com/Rajshah1103/PullMate/issues)
[![GitHub stars](https://img.shields.io/github/stars/Rajshah1103/PullMate.svg)](https://github.com/Rajshah1103/PullMate/stargazers)

> Automatically pull your git repositories every morning or on laptop startup ☕

PullMate is a cross-platform CLI tool that automatically keeps your git repositories up-to-date by pulling changes on startup and/or at scheduled times. Never miss important updates from your team again!

## ✨ Features

- 🔄 **Auto-pull on startup**: Automatically pull all configured repositories when your system starts
- ⏰ **Scheduled pulls**: Set up custom schedules (morning, evening, or any time you want)
- 📊 **Detailed logging**: Complete operation logs with timestamps, branch info, and status
- 🔔 **Desktop notifications**: Get notified when repositories are updated or encounter issues
- 🛡️ **Safe operations**: Only fast-forward pulls, warns about uncommitted changes and merge conflicts
- 🌐 **Cross-platform**: Works on macOS, Linux, and Windows
- 📁 **Multi-repo support**: Manage multiple repositories from a single configuration
- 🎯 **Smart detection**: Automatically detects "Already up to date" status and actual updates

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
    "morning": ["09:00", "12:00"],
    "evening": ["18:00", "21:00"]
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
| `schedules` | Object | Scheduled pull times | `{}` |

### Schedule Format

Schedules use 24-hour format (HH:MM):
```json
{
  "schedules": {
    "morning": "09:00",           // Single time
    "workday": ["09:00", "17:00"], // Multiple times
    "frequent": ["10:00", "14:00", "18:00"] // Multiple times
  }
}
```

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
| `pullmate --help` | Show help information |
| `pullmate --version` | Show version information |

## 📊 Status Indicators

PullMate provides clear status indicators for each repository:

- ✅ **up-to-date**: Repository is current, no changes pulled
- ✅ **updated**: New commits were pulled successfully
- ⚠️ **dirty**: Repository has uncommitted changes
- ⚠️ **diverged**: Local branch has diverged from remote
- ❌ **failed**: Operation failed (network issues, etc.)
- ❌ **not-a-git-repo**: Directory is not a git repository

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

### Log Rotation
Logs are automatically managed and rotated to prevent excessive disk usage.

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

### v1.0.2 (Latest)
- ⚡ **Performance optimization**: 50% reduction in git network calls
- 🔧 **Improved git operations**: Eliminated redundant fetching with fetch + merge approach
- 📊 **Better logging**: Separate FETCH and MERGE outputs for clearer debugging
- 🎯 **Enhanced error handling**: Distinct error reporting for different operation failures

### v1.0.1
- 🐛 **Documentation fixes**: Fixed broken GitHub badges and repository links
- 🐳 **Docker Hub support**: Published official Docker image
- 📖 **Enhanced Docker documentation**: Comprehensive usage examples and Docker Compose configs

### v1.0.0
- 🏗️ Production-grade modular architecture
- 🐳 Docker containerization support  
- ✅ Smart "Already up to date" detection
- 📊 Enhanced logging with detailed repository information
- 🎯 Comprehensive status categorization
- 🧪 Complete testing framework
- 📦 Automated publishing workflow
- 🌐 Cross-platform support (macOS, Linux, Windows)

## 🙏 Acknowledgments

- Thanks to all contributors who have helped improve PullMate
- Inspired by the need to keep development environments in sync
- Built with love for developers who manage multiple repositories

---

**Made with ❤️ by [Raj Shah](https://github.com/Rajshah1103) and contributors**
