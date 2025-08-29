const { spawn } = require('child_process');
const path = require('path');

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
        this.currentMethod = 'yt-dlp';
    }

    /**
     * Execute yt-dlp command and return JSON result
     * @param {Array} args - yt-dlp arguments
     * @returns {Promise<Object>} Parsed JSON result
     */
    async executeYtDlp(args) {
        return new Promise((resolve, reject) => {
            const ytDlp = spawn('yt-dlp', args, {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            ytDlp.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            ytDlp.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            ytDlp.on('close', (code) => {
                if (code === 0) {
                    try {
                        const result = JSON.parse(stdout);
                        resolve(result);
                    } catch (parseError) {
                        this.debug(`[YouTubeUtils] ❌ Failed to parse yt-dlp JSON output:`, parseError.message);
                        reject(new Error(`Failed to parse yt-dlp output: ${parseError.message}`));
                    }
                } else {
                    this.debug(`[YouTubeUtils] ❌ yt-dlp exited with code ${code}:`, stderr);
                    reject(new Error(`yt-dlp failed with code ${code}: ${stderr}`));
                }
            });

            ytDlp.on('error', (error) => {
                this.debug(`[YouTubeUtils] ❌ yt-dlp spawn error:`, error.message);
                reject(new Error(`Failed to spawn yt-dlp: ${error.message}`));
            });
        });
    }

    /**
     * Search for YouTube videos using yt-dlp with advanced filtering
     * @param {string} query - Search query
     * @param {Object} options - Search options
     * @returns {Promise<Array>} Array of video results
     */
    async searchVideosAdvanced(query, options = {}) {
        const {
            limit = 5,
            minDuration = 61, // Exclude videos shorter than 61 seconds (Shorts)
            maxDuration = null, // No max duration by default
            excludeShorts = true,
            preferMusic = false
        } = options;

        this.debug(`[YouTubeUtils] Advanced search for: "${query}" with options:`, options);
        
        try {
            // Add music-specific terms if preferMusic is enabled
            let searchQuery = query;
            if (preferMusic) {
                searchQuery = `${query} song music audio track`;
            }
            
            // Search for more results to allow for filtering
            const searchLimit = Math.max(limit * 4, 20);
            const ytSearchQuery = `ytsearch${searchLimit}:${searchQuery}`;
            
            const args = [
                '--dump-json',
                '--flat-playlist',
                '--no-warnings',
                ytSearchQuery
            ];

            // Add duration filter if specified
            if (minDuration > 0 || maxDuration) {
                const durationFilter = [];
                if (minDuration > 0) durationFilter.push(`duration>=${minDuration}`);
                if (maxDuration) durationFilter.push(`duration<=${maxDuration}`);
                if (durationFilter.length > 0) {
                    args.push('--match-filter', durationFilter.join(' & '));
                }
            }

            this.debug(`[YouTubeUtils] Executing advanced search: yt-dlp ${args.join(' ')}`);
            
            const ytDlp = spawn('yt-dlp', args, {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            ytDlp.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            ytDlp.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            return new Promise((resolve, reject) => {
                ytDlp.on('close', (code) => {
                    if (code === 0) {
                        try {
                            const lines = stdout.trim().split('\n').filter(line => line.trim());
                            const allResults = lines.map(line => {
                                const video = JSON.parse(line);
                                return {
                                    title: video.title || 'Unknown Title',
                                    url: `https://www.youtube.com/watch?v=${video.id}`,
                                    duration: video.duration || 0,
                                    thumbnail: video.thumbnail || null,
                                    id: video.id,
                                    uploader: video.uploader || 'Unknown'
                                };
                            });
                            
                            let filteredResults = allResults;
                            
                            if (excludeShorts) {
                                filteredResults = allResults.filter(video => {
                                    // Duration-based filtering
                                    if (video.duration > 0 && video.duration <= 60) {
                                        this.debug(`[YouTubeUtils] 🚫 Filtered Short by duration: "${video.title}" (${video.duration}s)`);
                                        return false;
                                    }
                                    
                                    // Title-based filtering
                                    const lowerTitle = video.title.toLowerCase();
                                    const shortsIndicators = [
                                        '#shorts', '#short', 'shorts',
                                        'tiktok', '#tiktok',
                                        'viral', 'trend',
                                        'quick', 'fast'
                                    ];
                                    
                                    if (shortsIndicators.some(indicator => lowerTitle.includes(indicator))) {
                                        this.debug(`[YouTubeUtils] 🚫 Filtered Short by title: "${video.title}"`);
                                        return false;
                                    }
                                    
                                    return true;
                                });
                            }
                            
                            // If preferMusic is enabled, prioritize music-related content
                            if (preferMusic) {
                                filteredResults.sort((a, b) => {
                                    const musicKeywords = ['official', 'music', 'audio', 'song', 'track', 'album', 'artist'];
                                    const aScore = musicKeywords.reduce((score, keyword) => 
                                        score + (a.title.toLowerCase().includes(keyword) ? 1 : 0), 0);
                                    const bScore = musicKeywords.reduce((score, keyword) => 
                                        score + (b.title.toLowerCase().includes(keyword) ? 1 : 0), 0);
                                    return bScore - aScore;
                                });
                            }
                            
                            const results = filteredResults.slice(0, limit);
                            
                            this.debug(`[YouTubeUtils] ✅ Advanced search completed: ${allResults.length} total → ${filteredResults.length} filtered → ${results.length} returned`);
                            resolve(results);
                        } catch (parseError) {
                            this.debug(`[YouTubeUtils] ❌ Failed to parse advanced search results:`, parseError.message);
                            reject(new Error(`Failed to parse search results: ${parseError.message}`));
                        }
                    } else {
                        this.debug(`[YouTubeUtils] ❌ yt-dlp advanced search failed with code ${code}:`, stderr);
                        reject(new Error(`yt-dlp search failed: ${stderr}`));
                    }
                });

                ytDlp.on('error', (error) => {
                    this.debug(`[YouTubeUtils] ❌ yt-dlp spawn error:`, error.message);
                    reject(new Error(`Failed to spawn yt-dlp: ${error.message}`));
                });
            });
        } catch (error) {
            this.debug(`[YouTubeUtils] ❌ Advanced search error:`, error.message);
            throw error;
        }
    }

    /**
     * Search for YouTube videos using yt-dlp (excludes Shorts)
     * @param {string} query - Search query
     * @param {number} limit - Maximum number of results
     * @returns {Promise<Array>} Array of video results
     */
    async searchVideos(query, limit = 5) {
        this.debug(`[YouTubeUtils] Starting yt-dlp search for: "${query}" (limit: ${limit})`);
        
        try {
            // Search for more results to filter out Shorts
            const searchLimit = Math.max(limit * 3, 15); // Get 3x more results to filter
            const searchQuery = `ytsearch${searchLimit}:${query}`;
            const args = [
                '--dump-json',
                '--flat-playlist',
                '--no-warnings',
                searchQuery
            ];

            this.debug(`[YouTubeUtils] Executing: yt-dlp ${args.join(' ')}`);
            
            // For search results, yt-dlp returns multiple JSON objects, one per line
            const ytDlp = spawn('yt-dlp', args, {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            ytDlp.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            ytDlp.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            return new Promise((resolve, reject) => {
                ytDlp.on('close', (code) => {
                    if (code === 0) {
                        try {
                            const lines = stdout.trim().split('\n').filter(line => line.trim());
                            const allResults = lines.map(line => {
                                const video = JSON.parse(line);
                                return {
                                    title: video.title || 'Unknown Title',
                                    url: `https://www.youtube.com/watch?v=${video.id}`,
                                    duration: video.duration || 0,
                                    thumbnail: video.thumbnail || null,
                                    id: video.id
                                };
                            });
                            
                            // Filter out YouTube Shorts (videos under 61 seconds)
                            // Also filter out videos with typical Shorts indicators
                            const filteredResults = allResults.filter(video => {
                                // Skip if duration is too short (likely a Short)
                                if (video.duration > 0 && video.duration <= 60) {
                                    this.debug(`[YouTubeUtils] 🚫 Filtered out Short: "${video.title}" (${video.duration}s)`);
                                    return false;
                                }
                                
                                // Skip if title contains typical Shorts indicators
                                const shortsKeywords = ['#shorts', '#short', 'shorts', 'tiktok'];
                                const lowerTitle = video.title.toLowerCase();
                                if (shortsKeywords.some(keyword => lowerTitle.includes(keyword))) {
                                    this.debug(`[YouTubeUtils] 🚫 Filtered out Short by title: "${video.title}"`);
                                    return false;
                                }
                                
                                return true;
                            });
                            
                            // Return only the requested number of results
                            const results = filteredResults.slice(0, limit);
                            
                            this.debug(`[YouTubeUtils] ✅ Search successful, found ${allResults.length} total, filtered to ${filteredResults.length}, returning ${results.length} results`);
                            resolve(results);
                        } catch (parseError) {
                            this.debug(`[YouTubeUtils] ❌ Failed to parse search results:`, parseError.message);
                            reject(new Error(`Failed to parse search results: ${parseError.message}`));
                        }
                    } else {
                        this.debug(`[YouTubeUtils] ❌ yt-dlp search failed with code ${code}:`, stderr);
                        reject(new Error(`yt-dlp search failed: ${stderr}`));
                    }
                });

                ytDlp.on('error', (error) => {
                    this.debug(`[YouTubeUtils] ❌ yt-dlp spawn error:`, error.message);
                    reject(new Error(`Failed to spawn yt-dlp: ${error.message}`));
                });
            });
        } catch (error) {
            this.debug(`[YouTubeUtils] ❌ Search error:`, error.message);
            throw error;
        }
    }

    /**
     * Get audio stream URL using yt-dlp
     * @param {string} url - YouTube video URL
     * @returns {Promise<string>} Audio stream URL
     */
    async getAudioUrl(url) {
        this.debug(`[YouTubeUtils] Getting audio URL for: ${url}`);
        
        try {
            const args = [
                '--dump-json',
                '--format', 'bestaudio[ext=m4a]/bestaudio/best',
                '--no-warnings',
                url
            ];

            this.debug(`[YouTubeUtils] Executing: yt-dlp ${args.join(' ')}`);
            
            const result = await this.executeYtDlp(args);
            
            if (result.url) {
                this.debug(`[YouTubeUtils] ✅ Audio URL retrieved successfully`);
                return result.url;
            } else if (result.formats && result.formats.length > 0) {
                // Find the best audio format
                const audioFormat = result.formats.find(f => f.acodec !== 'none' && f.vcodec === 'none') || 
                                   result.formats.find(f => f.acodec !== 'none') ||
                                   result.formats[0];
                
                if (audioFormat && audioFormat.url) {
                    this.debug(`[YouTubeUtils] ✅ Audio URL retrieved from formats`);
                    return audioFormat.url;
                }
            }
            
            throw new Error('No audio URL found in yt-dlp response');
        } catch (error) {
            this.debug(`[YouTubeUtils] ❌ Audio extraction failed:`, error.message);
            throw error;
        }
    }

    /**
     * Get video information using yt-dlp
     * @param {string} url - YouTube video URL
     * @returns {Promise<Object>} Video information
     */
    async getVideoInfo(url) {
        this.debug(`[YouTubeUtils] Getting video info for: ${url}`);
        
        try {
            const args = [
                '--dump-json',
                '--no-warnings',
                url
            ];

            const result = await this.executeYtDlp(args);
            
            return {
                title: result.title || 'Unknown Title',
                duration: result.duration || 0,
                thumbnail: result.thumbnail || null,
                uploader: result.uploader || 'Unknown',
                upload_date: result.upload_date || null,
                view_count: result.view_count || 0,
                like_count: result.like_count || 0,
                description: result.description || '',
                url: result.webpage_url || url
            };
        } catch (error) {
            this.debug(`[YouTubeUtils] ❌ Failed to get video info:`, error.message);
            throw error;
        }
    }

    /**
     * Get playlist information using yt-dlp
     * @param {string} url - YouTube playlist URL
     * @param {number} limit - Maximum number of videos to extract
     * @returns {Promise<Array>} Array of video information
     */
    async getPlaylistInfo(url, limit = 50) {
        this.debug(`[YouTubeUtils] Getting playlist info for: ${url} (limit: ${limit})`);
        
        try {
            const args = [
                '--dump-json',
                '--flat-playlist',
                '--playlist-end', limit.toString(),
                '--no-warnings',
                url
            ];

            // For playlist results, yt-dlp returns multiple JSON objects, one per line
            const ytDlp = spawn('yt-dlp', args, {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            ytDlp.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            ytDlp.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            return new Promise((resolve, reject) => {
                ytDlp.on('close', (code) => {
                    if (code === 0) {
                        try {
                            const lines = stdout.trim().split('\n').filter(line => line.trim());
                            const videos = lines.map(line => {
                                const video = JSON.parse(line);
                                return {
                                    title: video.title || 'Unknown Title',
                                    url: `https://www.youtube.com/watch?v=${video.id}`,
                                    duration: video.duration || 0,
                                    thumbnail: video.thumbnail || null,
                                    id: video.id
                                };
                            });
                            
                            this.debug(`[YouTubeUtils] ✅ Playlist extracted, found ${videos.length} videos`);
                            resolve(videos);
                        } catch (parseError) {
                            this.debug(`[YouTubeUtils] ❌ Failed to parse playlist results:`, parseError.message);
                            reject(new Error(`Failed to parse playlist results: ${parseError.message}`));
                        }
                    } else {
                        this.debug(`[YouTubeUtils] ❌ yt-dlp playlist extraction failed:`, stderr);
                        reject(new Error(`yt-dlp playlist extraction failed: ${stderr}`));
                    }
                });

                ytDlp.on('error', (error) => {
                    this.debug(`[YouTubeUtils] ❌ yt-dlp spawn error:`, error.message);
                    reject(new Error(`Failed to spawn yt-dlp: ${error.message}`));
                });
            });
        } catch (error) {
            this.debug(`[YouTubeUtils] ❌ Playlist extraction error:`, error.message);
            throw error;
        }
    }

    /**
     * Main method for getting video info (compatible with existing code)
     * @param {string} query - YouTube URL or search query
     * @returns {Promise<Object>} Video information
     */
    static async getVideoInfo(query) {
        const utils = new YouTubeUtils();
        
        try {
            if (utils.isValidYouTubeUrl(query)) {
                // It's a URL, get video info directly
                return await utils.getVideoInfo(query);
            } else {
                // It's a search query, search first then get info
                const searchResults = await utils.searchVideos(query, 1);
                if (searchResults.length > 0) {
                    return await utils.getVideoInfo(searchResults[0].url);
                } else {
                    throw new Error('No search results found');
                }
            }
        } catch (error) {
            console.error('Error getting video info:', error);
            throw new Error('Failed to get video information');
        }
    }

    /**
     * Check if URL is a valid YouTube URL
     */
    isValidYouTubeUrl(url) {
        const patterns = [
            /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/,
            /^(https?:\/\/)?(www\.)?youtube\.com\/playlist\?list=[\w-]+/
        ];
        
        return patterns.some(pattern => pattern.test(url));
    }

    /**
     * Search for music specifically (static method for search command)
     * @param {string} query - Search query
     * @param {number} limit - Maximum number of results
     * @returns {Promise<Array>} Array of music results
     */
    static async searchMusic(query, limit = 5) {
        const utils = new YouTubeUtils();
        return await utils.searchVideosAdvanced(query, {
            limit: limit,
            minDuration: 30, // Allow shorter songs but still exclude most Shorts
            excludeShorts: true,
            preferMusic: true
        });
    }

    /**
     * Check if URL is a valid YouTube URL (static method)
     */
    static validateURL(url) {
        const utils = new YouTubeUtils();
        return utils.isValidYouTubeUrl(url);
    }

    /**
     * Check if URL is a YouTube playlist
     */
    isPlaylist(url) {
        return /(?:youtube\.com\/playlist\?list=|youtube\.com\/watch\?.*&list=)/.test(url);
    }

    /**
     * Check if URL is a YouTube playlist (static method)
     */
    static isPlaylist(url) {
        const utils = new YouTubeUtils();
        return utils.isPlaylist(url);
    }

    /**
     * Get playlist information (static method for compatibility)
     */
    static async getPlaylistInfo(url) {
        const utils = new YouTubeUtils();
        return await utils.getPlaylistInfo(url);
    }

    /**
     * Format duration in seconds to MM:SS or HH:MM:SS format
     */
    formatDuration(seconds) {
        if (!seconds || seconds === 0) return '0:00';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }

    /**
     * Format duration in seconds to MM:SS or HH:MM:SS format (static method)
     */
    static formatDuration(seconds) {
        if (!seconds || seconds === 0) return '🔴 LIVE';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Format number for display (static method)
     */
    static formatNumber(num) {
        if (!num) return '0';
        
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }
}

module.exports = YouTubeUtils;
