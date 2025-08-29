const ytdl = require('ytdl-core');
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
        this.currentMethod = 'pure-nodejs';
    }

    /**
     * Get video information using ytdl-core
     * @param {string} url - YouTube video URL
     * @returns {Promise<Object>} Video information
     */
    async getVideoInfo(url) {
        try {
            debugLog(`Getting video info for: ${url}`);
            
            // Validate YouTube URL
            if (!ytdl.validateURL(url)) {
                throw new Error('Invalid YouTube URL');
            }
            
            // Get video info using ytdl-core
            const info = await ytdl.getInfo(url);
            const videoDetails = info.videoDetails;
            
            const result = {
                title: videoDetails.title || 'Unknown Title',
                duration: parseInt(videoDetails.lengthSeconds) || 0,
                uploader: videoDetails.author?.name || 'Unknown Artist',
                url: url,
                thumbnail: videoDetails.thumbnails?.[0]?.url || null,
                viewCount: parseInt(videoDetails.viewCount) || 0,
                uploadDate: videoDetails.publishDate || null
            };
            
            debugLog('Video info retrieved successfully', result);
            return result;
            
        } catch (error) {
            debugLog('Error getting video info', { error: error.message, url });
            throw new Error(`Failed to get video information: ${error.message}`);
        }
    }

    /**
     * Get audio stream URL using ytdl-core
     * @param {string} url - YouTube video URL
     * @returns {Promise<string>} Audio stream URL
     */
    async getAudioStream(url) {
        try {
            debugLog(`Getting audio stream for: ${url}`);
            
            if (!ytdl.validateURL(url)) {
                throw new Error('Invalid YouTube URL');
            }
            
            // Get audio formats
            const info = await ytdl.getInfo(url);
            const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
            
            if (audioFormats.length === 0) {
                throw new Error('No audio formats available');
            }
            
            // Return the URL for streaming
            debugLog('Audio stream URL obtained successfully');
            return url; // ytdl-core can stream directly from the URL
            
        } catch (error) {
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
            debugLog('Audio URL ready for Discord playbook');
            return url;
            
        } catch (error) {
            debugLog('Error getting audio URL', { error: error.message, url });
            throw new Error(`Failed to get audio URL: ${error.message}`);
        }
    }

    /**
     * Check if URL is a valid YouTube URL
     * @param {string} url - URL to validate
     * @returns {boolean} True if valid YouTube URL
     */
    isValidYouTubeUrl(url) {
        return ytdl.validateURL(url);
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
}

module.exports = YouTubeUtils;