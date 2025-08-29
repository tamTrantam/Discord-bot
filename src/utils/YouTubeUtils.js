const ytdl = require('ytdl-core');
const YouTube = require('youtube-sr').default;
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

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
        this.currentMethod = 'pure-nodejs';
    }

    /**
     * Get video information using ytdl-core
     * @param {string} url - YouTube video URL
     * @returns {Promise<Object>} Video information
     */
    async getVideoInfo(url) {
        console.log(`🎥 [YOUTUBE DEBUG] === STARTING VIDEO INFO RETRIEVAL ===`);
        console.log(`🎥 [YOUTUBE DEBUG] URL: ${url}`);
        console.log(`🎥 [YOUTUBE DEBUG] Method: ${this.currentMethod}`);
        
        try {
            debugLog(`Getting video info for: ${url}`);
            
            // Validate YouTube URL
            console.log(`🎥 [YOUTUBE DEBUG] Validating URL...`);
            const isValid = ytdl.validateURL(url);
            console.log(`🎥 [YOUTUBE DEBUG] URL validation result: ${isValid}`);
            
            if (!isValid) {
                console.log(`🎥 [YOUTUBE DEBUG] ❌ Invalid YouTube URL format`);
                throw new Error('Invalid YouTube URL');
            }
            
            // Get video info using ytdl-core
            console.log(`🎥 [YOUTUBE DEBUG] Calling ytdl.getInfo()...`);
            const startTime = Date.now();
            
            const info = await ytdl.getInfo(url);
            const endTime = Date.now();
            
            console.log(`🎥 [YOUTUBE DEBUG] ytdl.getInfo() completed in ${endTime - startTime}ms`);
            console.log(`🎥 [YOUTUBE DEBUG] Info object received:`, !!info);
            
            const videoDetails = info.videoDetails;
            console.log(`🎥 [YOUTUBE DEBUG] Video details available:`, !!videoDetails);
            
            if (!videoDetails) {
                console.log(`🎥 [YOUTUBE DEBUG] ❌ No video details in response`);
                throw new Error('No video details found');
            }
            
            console.log(`🎥 [YOUTUBE DEBUG] Title: "${videoDetails.title}"`);
            console.log(`🎥 [YOUTUBE DEBUG] Duration: ${videoDetails.lengthSeconds}s`);
            console.log(`🎥 [YOUTUBE DEBUG] Author: ${videoDetails.author?.name}`);
            
            const result = {
                title: videoDetails.title || 'Unknown Title',
                duration: parseInt(videoDetails.lengthSeconds) || 0,
                uploader: videoDetails.author?.name || 'Unknown Artist',
                url: url,
                thumbnail: videoDetails.thumbnails?.[0]?.url || null,
                viewCount: parseInt(videoDetails.viewCount) || 0,
                uploadDate: videoDetails.publishDate || null
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
            
            // Handle specific YouTube API errors
            if (error.message.includes('410') || error.message.includes('Status code: 410')) {
                console.log(`🎥 [YOUTUBE DEBUG] 410 error - trying alternative approach...`);
                
                // Try with different options for region-blocked content
                try {
                    console.log(`🎥 [YOUTUBE DEBUG] Retrying with alternate options...`);
                    const retryInfo = await ytdl.getInfo(url, { 
                        requestOptions: { 
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                            }
                        }
                    });
                    
                    if (retryInfo && retryInfo.videoDetails) {
                        console.log(`🎥 [YOUTUBE DEBUG] ✅ Retry successful!`);
                        const videoDetails = retryInfo.videoDetails;
                        
                        const result = {
                            title: videoDetails.title || 'Unknown Title',
                            duration: parseInt(videoDetails.lengthSeconds) || 0,
                            uploader: videoDetails.author?.name || 'Unknown Artist',
                            url: url,
                            thumbnail: videoDetails.thumbnails?.[0]?.url || null,
                            viewCount: parseInt(videoDetails.viewCount) || 0,
                            uploadDate: videoDetails.publishDate || null
                        };
                        
                        console.log(`🎥 [YOUTUBE DEBUG] ✅ Retry result:`, result);
                        return result;
                    }
                } catch (retryError) {
                    console.log(`🎥 [YOUTUBE DEBUG] Retry also failed:`, retryError.message);
                }
                
                // FINAL FALLBACK: Use yt-dlp (the original working method)
                console.log(`🎥 [YOUTUBE DEBUG] Trying yt-dlp fallback (original working method)...`);
                try {
                    const ytdlpResult = await this.getVideoInfoWithYtDlp(url);
                    console.log(`🎥 [YOUTUBE DEBUG] ✅ yt-dlp fallback successful!`);
                    return ytdlpResult;
                } catch (ytdlpError) {
                    console.log(`🎥 [YOUTUBE DEBUG] yt-dlp fallback also failed:`, ytdlpError.message);
                }
                
                throw new Error('Video is unavailable or region-blocked on this server');
            } else if (error.message.includes('403') || error.message.includes('Status code: 403')) {
                throw new Error('Video is private or restricted');
            } else if (error.message.includes('404') || error.message.includes('Status code: 404')) {
                throw new Error('Video not found on YouTube');
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
            return ytdl.validateURL(url);
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
     * Get audio stream URL using ytdl-core
     * @param {string} url - YouTube video URL
     * @returns {Promise<string>} Audio stream URL
     */
    async getAudioStream(url) {
        console.log(`🎵 [AUDIO DEBUG] === STARTING AUDIO STREAM RETRIEVAL ===`);
        console.log(`🎵 [AUDIO DEBUG] URL: ${url}`);
        
        try {
            debugLog(`Getting audio stream for: ${url}`);
            
            console.log(`🎵 [AUDIO DEBUG] Validating URL for audio stream...`);
            const isValid = ytdl.validateURL(url);
            console.log(`🎵 [AUDIO DEBUG] URL validation result: ${isValid}`);
            
            if (!isValid) {
                console.log(`🎵 [AUDIO DEBUG] ❌ Invalid URL for audio stream`);
                throw new Error('Invalid YouTube URL');
            }
            
            // Get audio formats
            console.log(`🎵 [AUDIO DEBUG] Getting video info for audio formats...`);
            const startTime = Date.now();
            
            const info = await ytdl.getInfo(url);
            const endTime = Date.now();
            
            console.log(`🎵 [AUDIO DEBUG] Video info for audio retrieved in ${endTime - startTime}ms`);
            console.log(`🎵 [AUDIO DEBUG] Total formats available: ${info.formats?.length || 0}`);
            
            const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
            console.log(`🎵 [AUDIO DEBUG] Audio-only formats available: ${audioFormats.length}`);
            
            if (audioFormats.length === 0) {
                console.log(`🎵 [AUDIO DEBUG] ❌ No audio formats available for this video`);
                console.log(`🎵 [AUDIO DEBUG] All formats:`, info.formats?.map(f => ({ itag: f.itag, mimeType: f.mimeType, hasAudio: f.hasAudio, hasVideo: f.hasVideo })));
                throw new Error('No audio formats available');
            }
            
            console.log(`🎵 [AUDIO DEBUG] Best audio format:`, { 
                itag: audioFormats[0].itag, 
                mimeType: audioFormats[0].mimeType,
                bitrate: audioFormats[0].audioBitrate,
                quality: audioFormats[0].audioQuality
            });
            
            // Return the URL for streaming
            console.log(`🎵 [AUDIO DEBUG] ✅ Audio stream URL obtained successfully`);
            debugLog('Audio stream URL obtained successfully');
            return url; // ytdl-core can stream directly from the URL
            
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
            
            if (!ytdl.validateURL(url)) {
                throw new Error('Invalid YouTube URL');
            }
            
            // For Discord voice, we can return the URL directly
            // ytdl-core will handle the streaming internally
            debugLog('Audio URL ready for Discord playback');
            return url;
            
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
    /**
     * Fallback method using yt-dlp (the original working approach)
     * @param {string} url - YouTube video URL
     * @returns {Promise<Object>} Video information
     */
    async getVideoInfoWithYtDlp(url) {
        console.log(`🎥 [YTDLP DEBUG] Using yt-dlp fallback for: ${url}`);
        
        try {
            // Use yt-dlp to get video info as JSON
            const command = `yt-dlp --dump-json --no-download "${url}"`;
            console.log(`🎥 [YTDLP DEBUG] Executing: ${command}`);
            
            const { stdout, stderr } = await execAsync(command, { 
                timeout: 30000,
                maxBuffer: 1024 * 1024 * 5 // 5MB buffer
            });
            
            if (stderr) {
                console.log(`🎥 [YTDLP DEBUG] stderr (may be warnings):`, stderr);
            }
            
            const videoData = JSON.parse(stdout);
            console.log(`🎥 [YTDLP DEBUG] Raw yt-dlp data received`);
            
            const result = {
                title: videoData.title || 'Unknown Title',
                duration: parseInt(videoData.duration) || 0,
                uploader: videoData.uploader || videoData.channel || 'Unknown Artist',
                url: url,
                thumbnail: videoData.thumbnail || null,
                viewCount: parseInt(videoData.view_count) || 0,
                uploadDate: videoData.upload_date || null
            };
            
            console.log(`🎥 [YTDLP DEBUG] ✅ Processed yt-dlp result:`, result);
            return result;
            
        } catch (error) {
            console.log(`🎥 [YTDLP DEBUG] ❌ yt-dlp failed:`, error.message);
            throw new Error(`yt-dlp fallback failed: ${error.message}`);
        }
    }
}

module.exports = YouTubeUtils;