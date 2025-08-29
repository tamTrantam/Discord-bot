const YouTube = require('youtube-sr').default;
const axios = require('axios');

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
        this.currentMethod = 'cobalt-api';
    }

    /**
     * Get video information using Cobalt API
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
            
            // Use Cobalt API for reliable YouTube processing
            console.log(`🎥 [YOUTUBE DEBUG] Calling Cobalt API for video info...`);
            const startTime = Date.now();
            
            console.log(`🎥 [YOUTUBE DEBUG] Using Cobalt API - production-ready solution`);
            
            const response = await axios.post('https://api.cobalt.tools/api/json', {
                url: url,
                videoQuality: 'max',
                audioFormat: 'best',
                audioBitrate: 'max',
                filenamePattern: 'basic',
                downloadMode: 'auto'
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'Discord-Music-Bot/1.0'
                },
                timeout: 30000
            });
            
            const endTime = Date.now();
            console.log(`🎥 [YOUTUBE DEBUG] Cobalt API completed in ${endTime - startTime}ms`);
            
            console.log(`🎥 [YOUTUBE DEBUG] Cobalt response status:`, response.data?.status);
            
            if (!response.data || response.data.status !== 'success') {
                console.log(`🎥 [YOUTUBE DEBUG] ❌ Cobalt API error:`, response.data?.text || 'Unknown error');
                throw new Error(`Cobalt API error: ${response.data?.text || 'Unknown error'}`);
            }
            
            // Extract video information from Cobalt response
            // Cobalt provides direct download URLs, we need to get metadata separately
            const videoInfo = await this.getVideoMetadata(url);
            
            const result = {
                title: videoInfo.title || 'Unknown Title',
                duration: videoInfo.duration || 0,
                uploader: videoInfo.uploader || 'Unknown Artist',
                url: url,
                thumbnail: videoInfo.thumbnail || null,
                viewCount: videoInfo.viewCount || 0,
                uploadDate: videoInfo.uploadDate || null,
                downloadUrl: response.data.url || response.data.urls?.[0] // Cobalt download URL
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
     * Get video metadata using youtube-sr for additional info
     * @param {string} url - YouTube video URL  
     * @returns {Promise<Object>} Video metadata
     */
    async getVideoMetadata(url) {
        try {
            const videoId = this.extractVideoId(url);
            if (!videoId) {
                throw new Error('Could not extract video ID from URL');
            }
            
            console.log(`🎥 [METADATA DEBUG] Getting metadata for video ID: ${videoId}`);
            
            // Use youtube-sr to get video metadata
            const video = await YouTube.searchOne(`https://youtube.com/watch?v=${videoId}`, 'video');
            
            if (!video) {
                console.log(`🎥 [METADATA DEBUG] No metadata found, using defaults`);
                return {
                    title: 'Unknown Title',
                    duration: 0,
                    uploader: 'Unknown Artist',
                    thumbnail: null,
                    viewCount: 0,
                    uploadDate: null
                };
            }
            
            console.log(`🎥 [METADATA DEBUG] Metadata retrieved: ${video.title}`);
            
            return {
                title: video.title || 'Unknown Title',
                duration: video.duration?.seconds || 0,
                uploader: video.channel?.name || 'Unknown Artist',
                thumbnail: video.thumbnail?.url || null,
                viewCount: video.views || 0,
                uploadDate: video.uploadedAt || null
            };
            
        } catch (error) {
            console.log(`🎥 [METADATA DEBUG] Error getting metadata:`, error.message);
            return {
                title: 'Unknown Title', 
                duration: 0,
                uploader: 'Unknown Artist',
                thumbnail: null,
                viewCount: 0,
                uploadDate: null
            };
        }
    }

    /**
     * Extract video ID from YouTube URL
     * @param {string} url - YouTube URL
     * @returns {string|null} Video ID or null if not found
     */
    extractVideoId(url) {
        const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
        return match ? match[1] : null;
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
     * Get an audio stream from a YouTube URL using Cobalt API
     * @param {string} url - YouTube video URL
     * @returns {Promise<Object>} Object containing audio URL and metadata
     */
    async getAudioStream(url) {
        try {
            console.log(`🎵 [COBALT DEBUG] Processing URL: ${url}`);
            
            // Get metadata first using youtube-sr
            const metadata = await this.getVideoMetadata(url);
            console.log(`🎵 [COBALT DEBUG] Got metadata: ${metadata.title}`);
            
            // Request audio from Cobalt API
            const cobaltResponse = await this.axios.post('https://api.cobalt.tools/api/json', {
                url: url,
                vCodec: 'h264',
                vQuality: '720',
                aFormat: 'mp3',
                isAudioOnly: true,
                disableMetadata: false
            }, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });
            
            console.log(`🎵 [COBALT DEBUG] API response status:`, cobaltResponse.data.status);
            
            if (cobaltResponse.data.status === 'stream' && cobaltResponse.data.url) {
                console.log(`🎵 [COBALT DEBUG] Got audio stream URL successfully`);
                
                return {
                    url: cobaltResponse.data.url,
                    title: metadata.title,
                    duration: metadata.duration,
                    uploader: metadata.uploader,
                    thumbnail: metadata.thumbnail,
                    format: {
                        container: 'mp3',
                        audioCodec: 'mp3'
                    }
                };
            } else {
                throw new Error(`Cobalt API error: ${cobaltResponse.data.text || 'Unknown error'}`);
            }
            
        } catch (error) {
            console.error('🎵 [AUDIO STREAM ERROR]:', error.message);
            
            // Return fallback info for testing
            if (error.message.includes('timeout') || error.message.includes('ENOTFOUND')) {
                const metadata = await this.getVideoMetadata(url);
                console.log(`🎵 [FALLBACK] Using metadata only for: ${metadata.title}`);
                
                return {
                    url: null, // Will indicate no audio stream available
                    title: metadata.title,
                    duration: metadata.duration, 
                    uploader: metadata.uploader,
                    thumbnail: metadata.thumbnail,
                    format: null,
                    error: 'Audio stream temporarily unavailable'
                };
            }
            
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
            
            // Get the audio stream data and return just the URL for backward compatibility
            const audioStreamData = await this.getAudioStream(url);
            
            if (audioStreamData && audioStreamData.url) {
                return audioStreamData.url;
            } else if (audioStreamData && audioStreamData.error) {
                throw new Error(audioStreamData.error);
            } else {
                throw new Error('No audio URL available');
            }
            
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

module.exports = YouTubeUtils;