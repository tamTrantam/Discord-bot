<!-- Discord Bot Project Instructions -->

## Project Overview
This is a modular Discord bot for YouTube music playback, queue management, and streaming capabilities.

## Technology Stack
- Node.js v16.9.0+
- discord.js v14
- @discordjs/voice for voice functionality
- youtube-dl-exec for YouTube audio extraction
- ytdl-core for YouTube streaming
- ffmpeg for audio processing

## Architecture
- Modular command structure with slash commands
- Event-driven architecture
- Queue management system with MusicQueue class
- Voice channel streaming capabilities
- Auto-disconnect when alone in voice channels

## Bot Features
- ✅ YouTube URL and search support
- ✅ Playlist support (up to 50 songs)
- ✅ Queue management (add, remove, skip, clear, shuffle)
- ✅ Loop and volume control
- ✅ Rich embeds with song information
- ✅ Auto-disconnect functionality
- ✅ Error handling and user validation

## File Structure
```
├── index.js                 # Main bot entry point
├── package.json             # Dependencies and scripts
├── .env                     # Environment configuration
├── src/
│   ├── commands/            # Slash command handlers
│   │   ├── play.js         # Play music command
│   │   ├── queue.js        # Show queue command
│   │   ├── skip.js         # Skip song command
│   │   ├── stop.js         # Stop music command
│   │   ├── pause.js        # Pause command
│   │   ├── resume.js       # Resume command
│   │   ├── volume.js       # Volume control
│   │   ├── nowplaying.js   # Show current song
│   │   ├── loop.js         # Toggle loop mode
│   │   ├── shuffle.js      # Shuffle queue
│   │   ├── clear.js        # Clear queue
│   │   ├── remove.js       # Remove song from queue
│   │   ├── help.js         # Help command
│   │   └── ping.js         # Ping command
│   ├── events/              # Event handlers
│   │   ├── ready.js        # Bot ready event
│   │   └── voiceStateUpdate.js # Voice state monitoring
│   └── utils/               # Utility classes
│       ├── MusicQueue.js   # Queue management class
│       └── YouTubeUtils.js # YouTube API utilities
```

## Environment Variables
- `DISCORD_TOKEN`: Bot token from Discord Developer Portal
- `DEFAULT_VOLUME`: Default playback volume (1-100)
- `MAX_QUEUE_SIZE`: Maximum songs in queue
- `MAX_SONG_DURATION`: Maximum song length in seconds

## Development Guidelines
- Use ES6+ syntax with proper error handling
- Follow Discord.js v14 best practices
- Implement proper voice channel validation
- Maintain clean separation of concerns
- Use rich embeds for user feedback

## Commands Available
### Music Commands
- `/play <song/url>` - Play YouTube music or add to queue
- `/queue` - Display current queue with song details
- `/skip` - Skip to next song in queue
- `/stop` - Stop music and clear entire queue
- `/pause` - Pause current playback
- `/resume` - Resume paused playback
- `/nowplaying` - Show currently playing song info

### Queue Management
- `/volume <1-100>` - Set playback volume
- `/loop` - Toggle loop mode for queue
- `/shuffle` - Shuffle current queue order
- `/clear` - Clear queue (keep current song)
- `/remove <position>` - Remove specific song from queue

### Utility
- `/help` - Display all available commands
- `/ping` - Check bot latency and API ping
