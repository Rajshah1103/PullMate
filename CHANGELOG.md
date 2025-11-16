# Changelog

All notable changes to PullMate will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
- � **Desktop notifications**: Cross-platform notifications for updates and issues
- ⏰ **Flexible scheduling**: Custom schedules with cron-like functionality
- 🌐 **Cross-platform support**: Works on macOS, Linux, and Windows
- � **Multi-repo management**: Handle multiple repositories from single configuration

### Features
- Auto-pull repositories on system startup
- Safe git operations that won't overwrite local changes  
- Enhanced "Already up to date" detection
- Detailed logging with repository information
- Interactive configuration editor
- Cross-platform startup registration (launchd, systemd, Windows Task Scheduler)

## [1.1.0] - 2025-11-07

### Fixed
- ✅ Fixed "Already up to date" git message detection that was causing updated count to always be zero
- Improved git pull output parsing to handle various git message formats
- Better branch name handling (trimming whitespace)

### Added
- 📊 Enhanced logging with detailed repository information including:
  - Repository name and full path
  - Current branch name
  - Detailed status with timestamps
  - Complete git fetch and pull output
- 🎯 Improved status categorization with separate counts for:
  - ✅ Updated repositories (with new commits)
  - 🔄 Up-to-date repositories (no changes)
  - ⚠️ Repositories with warnings (uncommitted changes, etc.)
  - ❌ Failed operations
- Better error messages and user feedback
- Structured logging for better debugging and monitoring

### Changed
- Updated summary display to show all four status categories
- Improved console output formatting with repository names and branch info
- Enhanced git command execution with better error handling

## [1.0.0] - 2025-11-06

### Added
- 🎉 Initial release of PullMate
- 🔄 Basic automatic git pull functionality
- ⏰ Schedule support for timed pulls (morning, evening, custom times)
- 🔔 Desktop notifications for repository updates and issues
- 🌐 Cross-platform support (macOS, Linux, Windows)
- 📁 Multi-repository management
- 🛡️ Safe git operations (fast-forward only, uncommitted changes detection)
- ⚙️ Configuration management with JSON config file
- 🚀 Startup registration for automatic execution on system boot
- 📝 Basic logging functionality

### Features
- Auto-pull repositories on system startup
- Custom scheduling with cron-like functionality
- Interactive configuration editor
- Safe git operations that won't overwrite local changes
- Desktop notifications for important events
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
