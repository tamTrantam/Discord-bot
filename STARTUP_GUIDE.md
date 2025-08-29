# Discord Music Bot v2.0 - Startup Scripts Guide

## 🚀 Quick Start

### For New Users
1. **First Time Setup**: Run `setup_environment.bat`
2. **Configure Bot**: Edit `.env` file with your Discord token
3. **Start Bot**: Run `start_bot.bat`

### For Existing Users
- **Regular Startup**: Run `start_bot.bat` (recommended)
- **Simple Startup**: Run `start.bat` (basic version)

## 📋 Script Descriptions

### `setup_environment.bat` - Initial Setup
**When to use**: First time installation or major updates
**What it does**:
- ✅ Cleans old dependencies
- ✅ Installs fresh npm packages
- ✅ Removes deprecated YouTube libraries
- ✅ Verifies yt-dlp installation
- ✅ Checks all bot files and new features
- ✅ Creates .env template
- ✅ Comprehensive system verification

**Features checked**:
- Channel binding system (bind.js, unbind.js)
- Interactive search system (search.js)
- Button utilities (ButtonUtils.js)
- Documentation files (BINDING_SYSTEM.md, BUTTON_GUIDE.md)

### `start_bot.bat` - Primary Startup Script
**When to use**: Daily bot startup (recommended)
**What it does**:
- ✅ Comprehensive dependency checking
- ✅ System requirements verification
- ✅ New feature file validation
- ✅ Configuration verification
- ✅ Detailed startup information
- ✅ Troubleshooting guidance

**Enhanced features**:
- Node.js version display
- yt-dlp version verification
- Missing file detection
- Configuration validation
- Startup instructions
- Error diagnostics

### `start.bat` - Simple Startup Script
**When to use**: Quick startup or automated deployment
**What it does**:
- ✅ Basic dependency checking
- ✅ Feature overview display
- ✅ npm dependency installation
- ✅ Configuration warnings
- ✅ Command file verification

**Streamlined for**:
- Faster startup process
- Automated environments
- Users familiar with the system

## 🎵 New Features Highlighted

All startup scripts now showcase **Discord Music Bot v2.0** features:

### ✨ Channel Binding System
- Persistent control panels in text channels
- Real-time updates every 30 seconds
- Merged now playing + queue interface
- Always-active button controls

### 🔍 Interactive Search
- Modal popup for search input
- Paginated results (3 per page)
- Direct song selection via buttons
- Advanced YouTube filtering (excludes Shorts)

### 🎛️ Enhanced Controls
- Complete music control via buttons
- Dynamic button states (enable/disable)
- Volume controls with smart limits
- Mobile-optimized interface

## 🔧 Troubleshooting Integration

### Dependency Checks
- **Node.js**: Minimum version 16.9.0
- **yt-dlp**: Required for YouTube audio extraction
- **npm packages**: Discord.js v14 and voice libraries

### Configuration Validation
- **.env file**: Checks for Discord token
- **File structure**: Verifies all command and utility files
- **New features**: Confirms binding system components

### Error Handling
- **Clear error messages**: Specific problem identification
- **Solution guidance**: Step-by-step troubleshooting
- **Debug mode**: Instructions for detailed logging

## 📱 Usage Instructions Built-in

All scripts now include quick start guides:

1. **Setup Instructions**: How to configure the bot
2. **Feature Usage**: How to use channel binding and search
3. **Troubleshooting**: Common issues and solutions
4. **Documentation**: References to detailed guides

## 🛠️ System Requirements Display

Enhanced system information:
- Node.js version verification
- yt-dlp installation status
- npm dependency health
- Bot configuration status
- New feature availability

## 📊 File Verification

Comprehensive checks for:
- **Core files**: index.js, package.json
- **Commands**: All 15+ command files including new ones
- **Utilities**: YouTube, queue, and button utilities
- **Documentation**: README, binding guide, button guide
- **Configuration**: .env file and templates

---

## 🎯 Recommended Workflow

### First Time Setup
```batch
1. setup_environment.bat    # Complete environment setup
2. Edit .env file          # Add Discord bot token
3. start_bot.bat          # Launch with full verification
```

### Daily Usage
```batch
start_bot.bat             # Recommended primary script
```

### Quick Restart
```batch
start.bat                 # Fast startup for experienced users
```

### After Updates
```batch
1. setup_environment.bat  # Verify new features
2. start_bot.bat         # Launch with verification
```

All scripts are now optimized for the **Channel Binding Edition** with comprehensive feature detection and user guidance!
