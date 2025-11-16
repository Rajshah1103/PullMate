# 📦 Versioning Guide for PullMate

This guide explains how to properly version and publish PullMate using Semantic Versioning (SemVer).

## 📏 Semantic Versioning (SemVer)

We follow [Semantic Versioning](https://semver.org/) with the format: `MAJOR.MINOR.PATCH`

### Version Types:
- **MAJOR** (X.0.0): Breaking changes that are incompatible with previous versions
- **MINOR** (0.X.0): New features that are backward-compatible
- **PATCH** (0.0.X): Bug fixes that are backward-compatible
- **PRERELEASE** (0.0.0-alpha.1): Pre-release versions for testing

## 🚀 Publishing Workflow

### 1. Before Publishing
Always ensure your code is ready:
```bash
# Run all tests
npm test

# Run linting
npm run lint

# Format code
npm run format

# Test locally
npm run dev
```

### 2. Version Bumping Commands

#### For Bug Fixes (Patch):
```bash
npm run publish:patch
# Example: 1.1.0 → 1.1.1
```

#### For New Features (Minor):
```bash
npm run publish:minor  
# Example: 1.1.1 → 1.2.0
```

#### For Breaking Changes (Major):
```bash
npm run publish:major
# Example: 1.2.0 → 2.0.0
```

#### For Beta Testing:
```bash
npm run publish:beta
# Example: 1.1.0 → 1.1.1-beta.0
```

#### For Alpha Testing:
```bash
npm run publish:alpha
# Example: 1.1.0 → 1.1.1-alpha.0
```

### 3. Manual Version Control (Alternative)

If you want more control over the process:

```bash
# 1. Bump version manually
npm version patch  # or minor, major, prerelease

# 2. Push tags to GitHub
git push origin main --tags

# 3. Publish to npm
npm publish
```

## 🏷️ Git Tags and Releases

### Automatic Tagging
The `npm version` command automatically:
- Updates `package.json` version
- Creates a git commit
- Creates a git tag (e.g., `v1.1.1`)

### Manual Git Operations
```bash
# View all tags
git tag

# Push tags to remote
git push origin --tags

# Create a release tag manually
git tag -a v1.1.1 -m "Version 1.1.1: Fixed git pull detection"
```

## 📋 Release Checklist

Before publishing a new version:

### ✅ Pre-Release Checklist:
- [ ] All tests pass (`npm test`)
- [ ] Code is linted (`npm run lint`)
- [ ] README.md is updated
- [ ] CHANGELOG.md is updated (see below)
- [ ] Version number follows SemVer
- [ ] No breaking changes in minor/patch releases
- [ ] Documentation is current

### ✅ Post-Release Checklist:
- [ ] GitHub release created with release notes
- [ ] Docker image updated and pushed
- [ ] Announce on relevant channels
- [ ] Update any dependent projects

## 📝 Changelog Management

### Update CHANGELOG.md Format:
```markdown
# Changelog

## [1.1.1] - 2025-11-07
### Fixed
- Fixed "Already up to date" git message detection
- Improved error handling in startup registration

### Added
- Enhanced logging with detailed repository information
- Docker support for containerized deployment

### Changed
- Refactored code to be more modular and production-ready
```

## 🐳 Docker Versioning

When publishing new versions, also update Docker:

```bash
# Build with version tag
docker build -t pullmate:1.1.1 -t pullmate:latest .

# Push to registry
docker push pullmate:1.1.1
docker push pullmate:latest
```

## 🎯 NPM Publishing Strategy

### Production Releases
```bash
# For stable releases
npm publish

# Check what will be published
npm pack --dry-run
```

### Beta/Alpha Releases
```bash
# Beta releases (more stable)
npm publish --tag beta

# Alpha releases (experimental)
npm publish --tag alpha
```

### Installing Different Versions
```bash
# Latest stable
npm install -g pullmate

# Beta version
npm install -g pullmate@beta

# Specific version
npm install -g pullmate@1.1.1
```

## 🔄 Hotfix Workflow

For urgent bug fixes:

```bash
# 1. Create hotfix branch
git checkout -b hotfix/critical-fix

# 2. Make the fix
# ... edit files ...

# 3. Test the fix
npm test

# 4. Commit and merge
git commit -m "Fix critical issue with startup registration"
git checkout main
git merge hotfix/critical-fix

# 5. Publish patch version
npm run publish:patch

# 6. Clean up
git branch -d hotfix/critical-fix
```

## 📊 Version History Examples

```bash
1.0.0   - Initial release
1.0.1   - Bug fixes
1.1.0   - Added Docker support
1.1.1   - Fixed git detection
1.2.0   - Added new scheduling features
2.0.0   - Breaking: Changed config format
```

## 🛠️ Development Versions

For local development and testing:

```bash
# Link for local testing
npm link

# Test globally
pullmate

# Unlink when done
npm unlink -g pullmate
```

## 🔍 Troubleshooting

### Common Issues:

**Version already exists:**
```bash
npm ERR! You cannot publish over the previously published versions
```
Solution: Bump version number first.

**Git not clean:**
```bash
npm ERR! Git working directory not clean
```
Solution: Commit all changes before versioning.

**Tests failing:**
```bash
npm ERR! Test failed
```
Solution: Fix tests before publishing (enforced by `prepublishOnly`).

---

**Remember: Always test thoroughly before publishing, and follow semantic versioning strictly to maintain user trust! 🚀**
