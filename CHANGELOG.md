# Changelog

All notable changes to PullMate will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] - 2025-11-18

### 🚀 Major Features
- ✨ **All-branch synchronization**: Now updates ALL local branches with their remote counterparts, not just the current branch
- 🎯 **Smart status detection**: Accurate "updated" vs "up-to-date" reporting based on actual commit changes
- 🧠 **Intelligent commit comparison**: Prevents false "updated" reports by comparing commit hashes before updating
- 📊 **Enhanced branch reporting**: Shows detailed summary of which other branches were updated, diverged, or failed

### 🐛 Critical Bug Fixes
- 🔧 **Fixed false update detection**: No more misleading "updated" status when nothing actually changed
- 📢 **Corrected fetch messages**: Shows "Updates fetched from remote" only when branches actually received updates
- ⚡ **Eliminated redundant operations**: Prevents unnecessary git operations on already up-to-date branches
- 🎯 **Accurate status tracking**: Fixed logic that incorrectly marked repos as updated on consecutive runs

### 💅 UI/UX Improvements
- 🖥️ **Clean CLI output**: Streamlined console display with better formatting and spacing
- 📝 **Informative branch summaries**: Shows "X updated, Y up-to-date" for other branches
- 🔇 **Reduced log noise**: Moved verbose logging to files, keeping console output clean and focused
- 🎨 **Better status indicators**: Clear visual distinction between different repository states

### 🏗️ Technical Improvements
- 🔍 **Enhanced git operations**: Better error handling and edge case management for diverged branches
- 📈 **Improved performance**: More efficient branch checking with early exit conditions
- 🛡️ **Safer updates**: Additional safety checks before updating branch references
- 📋 **Better data structures**: Enhanced branch update tracking with detailed status information

### 🎁 What This Means For You
- **No more stale branches**: When you switch to `master` or any other branch, it's already up-to-date!
- **Truthful reporting**: You'll know exactly what was actually updated vs what was already current
- **Cleaner experience**: Less visual clutter, more actionable information
- **Better reliability**: Consistent behavior across multiple runs

## [1.0.5] - 2025-11-18

### Fixed
- 🔧 **README fix**: Cleaned up corrupted header badges section
- 📝 **Documentation cleanup**: Proper formatting and badge display

## [1.0.4] - 2025-11-17

### Fixed
- ✅ **Fixed CLI commands**: Added proper `--help` and `--version` support with correct flags (`-h`, `-v`)
- 📝 **Documentation accuracy fixes**: 
  - ✨ **Schedule flexibility**: Clarified that ANY custom schedule names are supported (not just "morning"/"evening")
  - 📝 **Log rotation details**: Detailed Winston-based rotation with file size limits and archive counts
  - 🎯 **Technical precision**: Updated all README content to match actual implementation capabilities
- 🔧 **CLI improvements**: Better help text and version detection from package.json

## [1.0.3] - 2025-11-17

### Changed
- 📊 **Badge improvements**: Updated npm version badge to use shields.io for faster updates
- 🔧 **Documentation**: Better badge caching and reliability

## [1.0.2] - 2025-11-16

### Changed
- ⚡ **Performance optimization**: Eliminated redundant git fetching operations
- 🔧 **Git operations**: Replaced `git pull` with `git fetch + git merge` for better efficiency
- 📊 **Improved logging**: Separate FETCH and MERGE operation outputs for clearer debugging
- 🎯 **Better error handling**: Distinct error reporting for fetch vs merge failures

### Performance
- 🚀 **50% reduction** in git network calls per repository
- ⏱️ **Faster execution** when managing multiple repositories
- 🌐 **Maintains comprehensive sync**: Still fetches all branches, tags, and prunes dead references

## [1.0.1] - 2025-11-16

### Fixed
- 🐛 **README improvements**: Fixed broken GitHub Actions CI badge
- 🔗 **Repository links**: Corrected all GitHub repository references from grayquest-finance to Rajshah1103/PullMate
- 📋 **Badges**: Replaced broken CI badge with working GitHub issues and stars badges

### Added
- 🐳 **Docker Hub support**: Published official Docker image at `rajshah1103/pullmate:latest`
- 📖 **Enhanced Docker documentation**: Comprehensive Docker usage examples with volume mounts
- 🚀 **Docker installation guide**: Added Docker option to Quick Start section
- ⚙️ **Docker Compose examples**: Added configuration for scheduled runs
- 🌐 **Docker environment variables**: Documented container-specific settings

### Changed
- 🐳 **Dockerfile**: Updated ENTRYPOINT for proper argument handling
- 📚 **Documentation structure**: Improved README organization with clearer Docker sections

## [1.0.0] - 2025-11-16

### Added
- 🏗️ **Production-grade architecture**: Complete modular design with separate classes
  - `Logger` class with Winston integration and log rotation
  - `Scheduler` class for OS-level scheduling management  
  - `StartupManager` class for cross-platform startup registration
  - `ErrorHandler` class with comprehensive error management
- 🐳 **Docker containerization**: Full Docker support with multi-stage builds
- 🧪 **Testing framework**: Unit and integration tests with coverage reporting
- 📦 **NPM publishing workflow**: Automated versioning and publishing scripts
- 📝 **Comprehensive documentation**: Complete README, VERSIONING guide, and CHANGELOG
- ⚡ **Smart git operations**: Safe fast-forward pulls with better conflict detection
- 🔔 **Desktop notifications**: Cross-platform notifications for updates and issues
- ⏰ **Flexible scheduling**: Custom schedules with cron-like functionality
- 🌐 **Cross-platform support**: Works on macOS, Linux, and Windows
- 📁 **Multi-repo management**: Handle multiple repositories from single configuration

### Features
- Auto-pull repositories on system startup
- Safe git operations that won't overwrite local changes  
- Enhanced "Already up to date" detection
- Detailed logging with repository information
- Interactive configuration editor
- Cross-platform startup registration (launchd, systemd, Windows Task Scheduler)

---

## Version Guidelines

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR** version for incompatible API changes
- **MINOR** version for backward-compatible new features  
- **PATCH** version for backward-compatible bug fixes
- **PRERELEASE** versions (alpha, beta, rc) for testing

### Types of Changes
- **Added** for new features
- **Changed** for changes in existing functionality
- **Deprecated** for soon-to-be removed features
- **Removed** for now removed features
- **Fixed** for any bug fixes
- **Security** for vulnerability fixes
