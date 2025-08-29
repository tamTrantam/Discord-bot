<<<<<<< HEAD
# Discord Music Bot - yt-dlp Edition 🎵

A modern Discord music bot that uses **yt-dlp** for reliable YouTube audio streaming, bypassing the 2025 YouTube API restrictions that affect traditional Node.js libraries.

## ✨ Features

- 🎵 **YouTube Music Playback** - Stream audio from YouTube using modern yt-dlp
- 🎯 **Search & Direct URLs** - Search by song name or paste YouTube URLs
- 📋 **Queue Management** - Add, remove, shuffle, and view your music queue
- 🔁 **Loop Mode** - Loop individual songs or entire playlists
- 🔊 **Volume Control** - Adjust playback volume (0-100%)
- ⏯️ **Playback Controls** - Play, pause, skip, stop commands
- 🔄 **Auto-Skip** - Automatically plays next song in queue
- 🛡️ **Fallback System** - Alternative audio sources when YouTube fails
- 🐛 **Debug Mode** - Comprehensive logging for troubleshooting

## 🚀 Quick Start

### Prerequisites
- **Node.js** v20.18.0+ 
- **yt-dlp** installed and in PATH
- **FFmpeg** (included via ffmpeg-static)
- **Discord Bot Token**

### Installation

1. **Clone or download** this repository
2. **Run setup**: Double-click `setup_environment.bat`
3. **Configure bot**: Edit `.env` file with your Discord token
4. **Start bot**: Double-click `start_bot.bat`

### Environment Configuration

Create a `.env` file in the root directory:

```env
DISCORD_TOKEN=your_discord_bot_token_here
DEFAULT_VOLUME=50
DEBUG_MODE=true
```

## 📋 Commands

| Command | Description | Usage |
|---------|-------------|-------|
| `/play` | Play a song from YouTube | `/play a little more` |
| `/play` | Play from URL | `/play https://youtube.com/watch?v=...` |
| `/pause` | Pause current song | `/pause` |
| `/resume` | Resume playback | `/resume` |
| `/skip` | Skip to next song | `/skip` |
| `/stop` | Stop and clear queue | `/stop` |
| `/queue` | Show current queue | `/queue` |
| `/nowplaying` | Show current song | `/nowplaying` |
| `/volume` | Set volume (0-100) | `/volume 75` |
| `/loop` | Toggle loop mode | `/loop` |
| `/shuffle` | Shuffle the queue | `/shuffle` |
| `/remove` | Remove song from queue | `/remove 3` |
| `/clear` | Clear the entire queue | `/clear` |
| `/debug` | Show debug information | `/debug` |

## 🔧 Technical Details

### Architecture
- **Discord.js v14** - Discord API interaction
- **@discordjs/voice** - Voice channel audio streaming  
- **yt-dlp** - Modern YouTube content extraction (subprocess)
- **Node.js child_process** - Spawning yt-dlp commands
- **Invidious API** - Fallback YouTube proxy

### Why yt-dlp?
Traditional Node.js YouTube libraries (ytdl-core, play-dl, @distube/ytdl-core) all failed in 2025 due to YouTube API restrictions. yt-dlp is:
- ✅ **Actively maintained** (124k+ GitHub stars)
- ✅ **Bypass YouTube restrictions** 
- ✅ **Extract audio URLs reliably**
- ✅ **Support search and playlists**
- ✅ **Used by major projects** worldwide

### Performance
- **Search**: ~3-11 seconds (first-time yt-dlp execution)
- **Audio Extraction**: ~5-8 seconds  
- **Subsequent Operations**: Much faster due to caching
- **Memory Usage**: Low (~50MB typical)

## 🛠️ Development

### Project Structure
```
Discord Bot/
├── src/
│   ├── commands/           # Slash commands
│   │   ├── play.js        # Main music command
│   │   ├── pause.js       # Pause/resume controls
│   │   └── ...            # Other commands
│   ├── events/            # Discord.js events
│   │   ├── ready.js       # Bot startup
│   │   └── voiceStateUpdate.js
│   └── utils/             # Core utilities
│       ├── YouTubeUtils.js    # yt-dlp integration
│       ├── MusicQueue.js      # Queue management
│       └── ThirdPartyAudio.js # Fallback audio
├── index.js               # Main bot entry point
├── package.json           # Dependencies
├── start_bot.bat         # Easy startup script
└── setup_environment.bat # Environment setup
```

### Key Files
- **YouTubeUtils.js** - Modern yt-dlp subprocess implementation
- **MusicQueue.js** - Clean queue management with fallbacks
- **start_bot.bat** - Production-ready startup script

## 🐛 Troubleshooting

### Common Issues

**"Cannot find module 'yt-dlp'"**
- Install yt-dlp: `pip install yt-dlp`
- Ensure it's in your system PATH

**"Audio stream failed"**
- Check yt-dlp installation: `yt-dlp --version`
- Enable debug mode: Set `DEBUG_MODE=true` in `.env`
- Check Discord permissions

**"Bot not responding"**
- Verify Discord token in `.env`
- Check bot permissions in Discord server
- Ensure bot is in voice channel

### Debug Mode
Enable comprehensive logging by setting `DEBUG_MODE=true` in your `.env` file. This shows:
- yt-dlp command execution
- Audio stream creation process
- Queue management operations
- Voice connection status
- Error details and stack traces

## 📝 License

MIT License - Feel free to modify and distribute

## 🤝 Contributing

Contributions are welcome! This bot represents a modern approach to Discord music bots post-2025 YouTube API restrictions.

---

**Note**: This bot was created in response to the 2025 YouTube API restrictions that broke all traditional Node.js YouTube libraries. It demonstrates that yt-dlp + subprocess approach is the current working standard for YouTube content extraction.
=======
#Version 1.0
>>>>>>> 087a8afdd625db7481c922bc08a4cc7608d262be
