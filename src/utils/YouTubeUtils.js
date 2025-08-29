const { execSync } = require('child_process');
const YouTube = require('youtube-sr').default;

// Debug mode from environment
const DEBUG_MODE = process.env.DEBUG_MODE === 'true';

// Debug logging function
function debugLog(message, data = null) {
    if (DEBUG_MODE) {
        const timestamp = new Date().toISOString();
        console.log(`🔍 [YOUTUBE DEBUG ${timestamp}] ${message}`);
        if (data) {
            console.log('📊 YouTube Data:', JSON.stringify(data, null, 2));
        }
    }
}

class YouTubeUtils {
    constructor() {
        this.debug = debugLog;
        this.currentMethod = 'yt-dlp-direct';
    }

    /**
     * Get video information using yt-dlp directly
     * @param {string} url - YouTube video URL
     * @returns {Promise<Object>} Video information
     */
    async getVideoInfo(url) {
        console.log(`🎥 [YOUTUBE DEBUG] === STARTING VIDEO INFO RETRIEVAL ===`);
        console.log(`🎥 [YOUTUBE DEBUG] URL: ${url}`);
        console.log(`🎥 [YOUTUBE DEBUG] Method: ${this.currentMethod}`);
        
        try {
            debugLog(`Getting video info for: ${url}`);
            
            // Validate YouTube URL format
            console.log(`🎥 [YOUTUBE DEBUG] Validating URL...`);
            if (!this.isValidYouTubeUrl(url)) {
                console.log(`🎥 [YOUTUBE DEBUG] ❌ Invalid YouTube URL format`);
                throw new Error('Invalid YouTube URL');
            }
            
            // Use yt-dlp to get video information
            console.log(`🎥 [YOUTUBE DEBUG] Calling yt-dlp --dump-json...`);
            const startTime = Date.now();
            
            const command = `yt-dlp --dump-json --no-download "${url}"`;
            console.log(`🎥 [YOUTUBE DEBUG] Command: ${command}`);
            
            const output = execSync(command, { 
                encoding: 'utf8',
                timeout: 30000, // 30 second timeout
                maxBuffer: 1024 * 1024 * 10 // 10MB buffer
            });
            
            const endTime = Date.now();
            console.log(`🎥 [YOUTUBE DEBUG] yt-dlp completed in ${endTime - startTime}ms`);
            
            const videoData = JSON.parse(output);
            console.log(`🎥 [YOUTUBE DEBUG] Video data parsed successfully`);
            
            if (!videoData) {
                console.log(`🎥 [YOUTUBE DEBUG] ❌ No video data in response`);
                throw new Error('No video data found');
            }
            
            console.log(`🎥 [YOUTUBE DEBUG] Title: "${videoData.title}"`);
            console.log(`🎥 [YOUTUBE DEBUG] Duration: ${videoData.duration}s`);
            console.log(`🎥 [YOUTUBE DEBUG] Uploader: ${videoData.uploader}`);
            
            const result = {
                title: videoData.title || 'Unknown Title',
                duration: parseInt(videoData.duration) || 0,
                uploader: videoData.uploader || videoData.channel || 'Unknown Artist',
                url: url,
                thumbnail: videoData.thumbnail || null,
                viewCount: parseInt(videoData.view_count) || 0,
                uploadDate: videoData.upload_date || null
            };
            
            console.log(`🎥 [YOUTUBE DEBUG] ✅ Video info processed successfully:`, result);
            debugLog('Video info retrieved successfully', result);
            return result;
            
        } catch (error) {
            console.log(`🎥 [YOUTUBE DEBUG] ❌ === ERROR IN VIDEO INFO RETRIEVAL ===`);
            console.log(`🎥 [YOUTUBE DEBUG] Error message: ${error.message}`);
            console.log(`🎥 [YOUTUBE DEBUG] Error stack:`, error.stack);
            console.log(`🎥 [YOUTUBE DEBUG] URL that failed: ${url}`);
            
            debugLog('Error getting video info', { error: error.message, url });
            
            // Handle specific errors
            if (error.message.includes('ERROR: Video unavailable')) {
                throw new Error('Video is unavailable or region-blocked');
            } else if (error.message.includes('ERROR: Private video')) {
                throw new Error('Video is private or restricted');
            } else if (error.message.includes('ERROR: This video is not available')) {
                throw new Error('Video not found on YouTube');
            } else if (error.message.includes('timeout') || error.message.includes('TIMEOUT')) {
                throw new Error('Request timed out - video may be too long or server is slow');
            } else {
                throw new Error(`Failed to get video information: ${error.message}`);
            }
        }
    }

    /**
     * Check if URL is a YouTube playlist
     * @param {string} url - URL to check
     * @returns {boolean} True if URL is a playlist
     */
    isPlaylist(url) {
        try {
            if (!url || typeof url !== 'string') return false;
            
            // Check for playlist indicators in URL
            const playlistPatterns = [
                /[?&]list=([a-zA-Z0-9_-]+)/,
                /playlist\?list=([a-zA-Z0-9_-]+)/,
                /\/playlist\?list=([a-zA-Z0-9_-]+)/
            ];
            
            return playlistPatterns.some(pattern => pattern.test(url));
        } catch (error) {
            debugLog('Error checking if playlist', { error: error.message, url });
            return false;
        }
    }

    /**
     * Get playlist information (fallback to single video for now)
     * @param {string} url - Playlist URL
     * @returns {Promise<Array>} Array of video information
     */
    async getPlaylistInfo(url) {
        try {
            debugLog(`Getting playlist info for: ${url}`);
            
            // For now, treat as single video since ytdl-core doesn't handle playlists directly
            // This is a temporary solution - would need youtube-dl-exec or similar for full playlist support
            if (!this.isPlaylist(url)) {
                const videoInfo = await this.getVideoInfo(url);
                return [videoInfo];
            }
            
            // Extract video ID from playlist URL and get individual video
            const videoIdMatch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
            if (videoIdMatch) {
                const videoUrl = `https://youtube.com/watch?v=${videoIdMatch[1]}`;
                const videoInfo = await this.getVideoInfo(videoUrl);
                return [videoInfo];
            }
            
            throw new Error('Playlist processing not fully implemented - extracted single video instead');
            
        } catch (error) {
            debugLog('Error getting playlist info', { error: error.message, url });
            throw new Error(`Failed to get playlist information: ${error.message}`);
        }
    }

    /**
     * Validate YouTube URL
     * @param {string} url - URL to validate
     * @returns {boolean} True if valid YouTube URL
     */
    validateURL(url) {
        try {
            if (!url || typeof url !== 'string') return false;
            
            // Check for YouTube URL patterns
            const youtubePatterns = [
                /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+/,
                /youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
                /youtu\.be\/([a-zA-Z0-9_-]+)/,
                /youtube\.com\/embed\/([a-zA-Z0-9_-]+)/
            ];
            
            return youtubePatterns.some(pattern => pattern.test(url));
        } catch (error) {
            debugLog('Error validating URL', { error: error.message, url });
            return false;
        }
    }

    /**
     * Format duration from seconds to MM:SS or HH:MM:SS
     * @param {number} seconds - Duration in seconds
     * @returns {string} Formatted duration string
     */
    formatDuration(seconds) {
        try {
            if (!seconds || seconds === 0) return '0:00';
            
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = Math.floor(seconds % 60);
            
            if (hours > 0) {
                return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            }
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        } catch (error) {
            debugLog('Error formatting duration', { error: error.message, seconds });
            return '0:00';
        }
    }

    /**
     * Get audio stream URL using yt-dlp
     * @param {string} url - YouTube video URL
     * @returns {Promise<string>} Audio stream URL
     */
    async getAudioStream(url) {
        console.log(`🎵 [AUDIO DEBUG] === STARTING AUDIO STREAM RETRIEVAL ===`);
        console.log(`🎵 [AUDIO DEBUG] URL: ${url}`);
        
        try {
            debugLog(`Getting audio stream for: ${url}`);
            
            console.log(`🎵 [AUDIO DEBUG] Validating URL for audio stream...`);
            const isValid = this.validateURL(url);
            console.log(`🎵 [AUDIO DEBUG] URL validation result: ${isValid}`);
            
            if (!isValid) {
                console.log(`🎵 [AUDIO DEBUG] ❌ Invalid URL for audio stream`);
                throw new Error('Invalid YouTube URL');
            }
            
            // Get audio URL using yt-dlp
            console.log(`🎵 [AUDIO DEBUG] Getting audio URL with yt-dlp...`);
            const startTime = Date.now();
            
            const command = `yt-dlp -f "bestaudio[ext=m4a]/bestaudio/best" --get-url "${url}"`;
            console.log(`🎵 [AUDIO DEBUG] Command: ${command}`);
            
            const audioUrl = execSync(command, { 
                encoding: 'utf8',
                timeout: 30000,
                maxBuffer: 1024 * 1024 * 10
            }).trim();
            
            const endTime = Date.now();
            console.log(`🎵 [AUDIO DEBUG] yt-dlp audio URL retrieved in ${endTime - startTime}ms`);
            
            if (!audioUrl) {
                console.log(`🎵 [AUDIO DEBUG] ❌ No audio URL returned`);
                throw new Error('No audio URL available');
            }
            
            console.log(`🎵 [AUDIO DEBUG] ✅ Audio stream URL obtained successfully`);
            debugLog('Audio stream URL obtained successfully');
            return audioUrl;
            
        } catch (error) {
            console.log(`🎵 [AUDIO DEBUG] ❌ === ERROR IN AUDIO STREAM RETRIEVAL ===`);
            console.log(`🎵 [AUDIO DEBUG] Error message: ${error.message}`);
            console.log(`🎵 [AUDIO DEBUG] Error stack:`, error.stack);
            console.log(`🎵 [AUDIO DEBUG] URL that failed: ${url}`);
            
            debugLog('Error getting audio stream', { error: error.message, url });
            throw new Error(`Failed to get audio stream: ${error.message}`);
        }
    }

    /**
     * Search for YouTube videos using youtube-sr
     * @param {string} query - Search query
     * @param {number} limit - Number of results to return
     * @returns {Promise<Array>} Array of video results
     */
    async searchVideos(query, limit = 10) {
        try {
            debugLog(`Searching for videos: ${query}`);
            
            const results = await YouTube.search(query, {
                limit: limit,
                type: 'video',
                safeSearch: false
            });
            
            const processedResults = results.map(video => ({
                title: video.title || 'Unknown Title',
                url: video.url || `https://youtube.com/watch?v=${video.id}`,
                duration: video.durationFormatted || 'Unknown Duration',
                thumbnail: video.thumbnail?.url || null,
                uploader: video.channel?.name || 'Unknown Artist'
            }));
            
            debugLog(`Found ${processedResults.length} video results`);
            return processedResults;
            
        } catch (error) {
            debugLog('Error searching videos', { error: error.message, query });
            throw new Error(`Failed to search videos: ${error.message}`);
        }
    }

    /**
     * Get audio URL suitable for Discord voice playback
     * @param {string} url - YouTube video URL
     * @returns {Promise<string>} Audio stream URL
     */
    async getAudioUrl(url) {
        try {
            debugLog(`Getting audio URL for Discord: ${url}`);
            
            if (!this.validateURL(url)) {
                throw new Error('Invalid YouTube URL');
            }
            
            // Get the actual streaming URL using yt-dlp
            return await this.getAudioStream(url);
            
        } catch (error) {
            debugLog('Error getting audio URL', { error: error.message, url });
            throw new Error(`Failed to get audio URL: ${error.message}`);
        }
    }

    /**
     * Check if URL is a valid YouTube URL (alias for validateURL)
     * @param {string} url - URL to validate
     * @returns {boolean} True if valid YouTube URL
     */
    isValidYouTubeUrl(url) {
        return this.validateURL(url);
    }

    /**
     * Get video duration in seconds
     * @param {string} url - YouTube video URL
     * @returns {Promise<number>} Duration in seconds
     */
    async getVideoDuration(url) {
        try {
            const info = await this.getVideoInfo(url);
            return info.duration;
        } catch (error) {
            debugLog('Error getting video duration', { error: error.message, url });
            return 0;
        }
    }

    /**
     * Static method for quick video info lookup
     * @param {string} url - YouTube video URL
     * @returns {Promise<Object>} Video information
     */
    static async getVideoInfo(url) {
        const utils = new YouTubeUtils();
        return utils.getVideoInfo(url);
    }

    /**
     * Static method for quick video search
     * @param {string} query - Search query
     * @param {number} limit - Number of results
     * @returns {Promise<Array>} Video results
     */
    static async searchMusic(query, limit = 10) {
        const utils = new YouTubeUtils();
        return utils.searchVideos(query, limit);
    }

    /**
     * Static method for playlist checking
     * @param {string} url - URL to check
     * @returns {boolean} True if playlist
     */
    static isPlaylist(url) {
        const utils = new YouTubeUtils();
        return utils.isPlaylist(url);
    }

    /**
     * Static method for playlist info
     * @param {string} url - Playlist URL
     * @returns {Promise<Array>} Playlist videos
     */
    static async getPlaylistInfo(url) {
        const utils = new YouTubeUtils();
        return utils.getPlaylistInfo(url);
    }

    /**
     * Static method for URL validation
     * @param {string} url - URL to validate
     * @returns {boolean} True if valid
     */
    static validateURL(url) {
        const utils = new YouTubeUtils();
        return utils.validateURL(url);
    }

    /**
     * Static method for duration formatting
     * @param {number} seconds - Duration in seconds
     * @returns {string} Formatted duration
     */
    static formatDuration(seconds) {
        const utils = new YouTubeUtils();
        return utils.formatDuration(seconds);
    }
}