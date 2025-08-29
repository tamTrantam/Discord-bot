const { 
    createAudioPlayer, 
    createAudioResource, 
    AudioPlayerStatus, 
    VoiceConnectionStatus,
    joinVoiceChannel,
    getVoiceConnection
} = require('@discordjs/voice');
const fetch = require('node-fetch');
const YouTubeUtils = require('./YouTubeUtils');
const ThirdPartyAudio = require('./ThirdPartyAudio');

// Debug mode from environment
const DEBUG_MODE = process.env.DEBUG_MODE === 'true';

// Debug logging function
function debugLog(message, data = null) {
    if (DEBUG_MODE) {
        const timestamp = new Date().toISOString();
        console.log(`🎵 [MUSIC DEBUG ${timestamp}] ${message}`);
        if (data) {
            console.log('📊 Music Data:', JSON.stringify(data, null, 2));
        }
    }
}

class MusicQueue {
    constructor(guildId) {
        this.guildId = guildId;
        this.songs = [];
        this.currentSong = null;
        this.player = createAudioPlayer();
        this.connection = null;
        this.volume = parseInt(process.env.DEFAULT_VOLUME) || 50;
        this.loop = false;
        this.playing = false;
        this.thirdPartyAudio = new ThirdPartyAudio();
        
        debugLog(`Creating new MusicQueue for guild: ${guildId}`);
        this.setupPlayerEvents();
    }

    setupPlayerEvents() {
        this.player.on(AudioPlayerStatus.Playing, () => {
            this.playing = true;
            const songTitle = this.currentSong?.title || 'Unknown';
            console.log(`🎵 Now playing: ${songTitle}`);
            debugLog(`Audio player started playing`, {
                guild: this.guildId,
                song: songTitle
            });
        });

        this.player.on(AudioPlayerStatus.Idle, () => {
            this.playing = false;
            console.log('⏹️ Song finished');
            debugLog(`Audio player went idle`, {
                guild: this.guildId,
                currentSong: this.currentSong?.title
            });
            this.handleSongEnd();
        });

        this.player.on(AudioPlayerStatus.Paused, () => {
            this.playing = false;
            console.log('⏸️ Song paused');
            debugLog(`Audio player paused`, {
                guild: this.guildId,
                currentSong: this.currentSong?.title
            });
        });

        this.player.on('error', (error) => {
            console.error('❌ Audio player error:', error);
            debugLog(`Audio player error`, {
                guild: this.guildId,
                error: error.message,
                stack: error.stack
            });
            this.handleSongEnd();
        });
    }

    async connect(voiceChannel) {
        try {
            debugLog(`Attempting to join voice channel`, {
                guild: this.guildId,
                channelId: voiceChannel.id,
                channelName: voiceChannel.name,
                memberCount: voiceChannel.members.size
            });

            this.connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: voiceChannel.guild.id,
                adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            });

            debugLog(`Successfully joined voice channel`, {
                guild: this.guildId,
                channelId: voiceChannel.id
            });

            this.connection.on(VoiceConnectionStatus.Ready, () => {
                debugLog(`Voice connection ready`, {
                    guild: this.guildId,
                    channelId: voiceChannel.id
                });
            });

            this.connection.on(VoiceConnectionStatus.Disconnected, () => {
                debugLog(`Voice connection disconnected`, {
                    guild: this.guildId
                });
            });

            this.connection.on('error', (error) => {
                console.error('❌ Voice connection error:', error);
                debugLog(`Voice connection error`, {
                    guild: this.guildId,
                    error: error.message
                });
            });

            this.connection.subscribe(this.player);
            return true;
        } catch (error) {
            console.error('❌ Failed to join voice channel:', error);
            debugLog(`Failed to join voice channel`, {
                guild: this.guildId,
                error: error.message,
                stack: error.stack
            });
            return false;
        }
    }

    disconnect() {
        if (this.connection) {
            this.connection.destroy();
            this.connection = null;
            debugLog(`Voice connection destroyed`, {
                guild: this.guildId
            });
        }
    }

    async addSong(query, requestedBy) {
        try {
            const startTime = Date.now();
            debugLog(`Adding song to queue`, {
                guild: this.guildId,
                query: query
            });

            let song;
            
            // Check if query is already a song object or a string query
            if (typeof query === 'object' && query.title) {
                // It's already a song object, use it directly
                song = {
                    title: query.title,
                    url: query.url,
                    duration: query.duration,
                    thumbnail: query.thumbnail,
                    author: query.uploader || query.author,
                    requestedBy: query.requestedBy || requestedBy,
                    addedAt: new Date().toISOString()
                };
            } else {
                // It's a query string, get video information using yt-dlp
                const videoInfo = await YouTubeUtils.getVideoInfo(query);
                
                song = {
                    title: videoInfo.title,
                    url: videoInfo.url,
                    duration: videoInfo.duration,
                    thumbnail: videoInfo.thumbnail,
                    author: videoInfo.uploader,
                    requestedBy: requestedBy,
                    addedAt: new Date().toISOString()
                };
            }

            this.songs.push(song);
            
            const executionTime = Date.now() - startTime;
            debugLog(`Song added to queue`, {
                guild: this.guildId,
                song: {
                    title: song.title,
                    duration: song.duration
                },
                queuePosition: this.songs.length,
                queueLength: this.songs.length,
                executionTime
            });

            return song;
        } catch (error) {
            console.error('❌ Failed to add song:', error);
            debugLog(`Failed to add song to queue`, {
                guild: this.guildId,
                query: query,
                error: error.message
            });
            throw error;
        }
    }

    async play() {
        if (this.songs.length === 0) {
            console.log('📭 Queue is empty');
            debugLog(`Attempted to play but queue is empty`, { guild: this.guildId });
            return false;
        }

        if (!this.connection) {
            console.log('❌ Not connected to voice channel');
            debugLog(`Attempted to play but not connected to voice channel`, { guild: this.guildId });
            return false;
        }

        try {
            this.currentSong = this.songs[0];
            console.log(`🎵 Attempting to play: ${this.currentSong.title}`);
            
            debugLog(`Starting playback`, {
                guild: this.guildId,
                song: {
                    title: this.currentSong.title,
                    url: this.currentSong.url,
                    duration: this.currentSong.duration
                },
                queueLength: this.songs.length
            });

            let audioResource;
            const startTime = Date.now();
            let streamCreated = false;
            
            // Try yt-dlp for YouTube content
            try {
                debugLog(`Trying yt-dlp for audio stream`, {
                    guild: this.guildId,
                    url: this.currentSong.url
                });
                
                const utils = new YouTubeUtils();
                const audioUrl = await utils.getAudioUrl(this.currentSong.url);
                
                if (audioUrl) {
                    debugLog(`Got audio URL from yt-dlp`);
                    
                    const response = await fetch(audioUrl, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                            'Referer': 'https://www.youtube.com/'
                        }
                    });
                    
                    if (response.ok) {
                        audioResource = createAudioResource(response.body, {
                            inputType: 'arbitrary',
                        });
                        streamCreated = true;
                        debugLog(`Successfully created audio stream with yt-dlp`);
                    }
                }
            } catch (error) {
                debugLog(`yt-dlp audio stream failed: ${error.message}`);
            }

            if (!streamCreated) {
                const executionTime = Date.now() - startTime;
                throw new Error(`Audio streaming failed after ${executionTime}ms`);
            }

            this.player.play(audioResource);
            const executionTime = Date.now() - startTime;
            
            debugLog(`Audio playback started successfully`, {
                guild: this.guildId,
                song: this.currentSong.title,
                executionTime
            });

            return true;
        } catch (error) {
            console.error('❌ Failed to play song:', error);
            debugLog(`Failed to play song`, {
                guild: this.guildId,
                song: this.currentSong?.title,
                error: error.message,
                stack: error.stack
            });
            
            this.handleSongEnd();
            return false;
        }
    }

    async handleSongEnd() {
        if (this.loop && this.currentSong) {
            debugLog(`Looping current song`, {
                guild: this.guildId,
                song: this.currentSong.title
            });
            this.play();
        } else {
            this.songs.shift(); // Remove current song
            debugLog(`Song removed from queue`, {
                guild: this.guildId,
                remainingCount: this.songs.length
            });
            
            if (this.songs.length > 0) {
                setTimeout(() => this.play(), 1000);
            } else {
                this.currentSong = null;
                console.log('📭 Queue finished');
                debugLog(`Queue finished`, { guild: this.guildId });
            }
        }
    }

    pause() {
        this.player.pause();
        debugLog(`Playback paused`, { guild: this.guildId });
        return true;
    }

    resume() {
        this.player.unpause();
        debugLog(`Playback resumed`, { guild: this.guildId });
        return true;
    }

    stop() {
        this.player.stop();
        this.songs = [];
        this.currentSong = null;
        debugLog(`Playback stopped and queue cleared`, { guild: this.guildId });
        return true;
    }

    clear() {
        this.songs = [];
        this.currentSong = null;
        debugLog(`Queue cleared`, { guild: this.guildId });
        return true;
    }

    skip() {
        if (this.songs.length === 0) {
            debugLog(`Attempted to skip but queue is empty`, { guild: this.guildId });
            return false;
        }
        
        debugLog(`Skipping current song`, {
            guild: this.guildId,
            currentSong: this.currentSong?.title,
            remainingCount: this.songs.length - 1
        });
        
        this.player.stop();
        return true;
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(100, volume));
        debugLog(`Volume set to ${this.volume}%`, { guild: this.guildId });
        return this.volume;
    }

    setLoop(enabled) {
        this.loop = enabled;
        debugLog(`Loop ${enabled ? 'enabled' : 'disabled'}`, { guild: this.guildId });
        return this.loop;
    }

    toggleLoop() {
        this.loop = !this.loop;
        debugLog(`Loop ${this.loop ? 'enabled' : 'disabled'}`, { guild: this.guildId });
        return this.loop;
    }

    shuffle() {
        if (this.songs.length <= 1) {
            debugLog(`Cannot shuffle - insufficient songs`, {
                guild: this.guildId,
                songCount: this.songs.length
            });
            return false;
        }
        
        // Preserve current song, shuffle the rest
        const currentSong = this.songs.shift();
        
        for (let i = this.songs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.songs[i], this.songs[j]] = [this.songs[j], this.songs[i]];
        }
        
        this.songs.unshift(currentSong);
        
        debugLog(`Queue shuffled`, {
            guild: this.guildId,
            songCount: this.songs.length
        });
        
        return true;
    }

    removeSong(index) {
        if (index < 1 || index >= this.songs.length) {
            debugLog(`Invalid remove index: ${index}`, {
                guild: this.guildId,
                queueLength: this.songs.length
            });
            return null;
        }
        
        const removedSong = this.songs.splice(index, 1)[0];
        
        debugLog(`Song removed from queue`, {
            guild: this.guildId,
            removedSong: removedSong.title,
            position: index,
            remainingCount: this.songs.length
        });
        
        return removedSong;
    }

    getQueue() {
        return {
            current: this.currentSong,
            queue: this.songs,
            playing: this.playing,
            loop: this.loop,
            volume: this.volume
        };
    }

    getCurrentSong() {
        if (!this.currentSong) return null;
        
        return {
            title: this.currentSong.title,
            duration: YouTubeUtils.formatDuration(this.currentSong.duration),
            requestedBy: this.currentSong.requestedBy,
            playing: this.playing,
            loop: this.loop,
            volume: this.volume,
            isFallback: this.currentSong.isFallback || false
        };
    }

    validateYouTubeURL(url) {
        return YouTubeUtils.validateURL(url);
    }

    extractVideoId(url) {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
            /youtube\.com\/embed\/([^&\n?#]+)/,
            /youtube\.com\/v\/([^&\n?#]+)/
        ];
        
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }
        
        return null;
    }
}

module.exports = MusicQueue;
