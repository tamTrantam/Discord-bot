const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const { createAudioResource } = require('@discordjs/voice');

// Debug mode from environment
const DEBUG_MODE = process.env.DEBUG_MODE === 'true';

// Debug logging function
function debugLog(message, data = null) {
    if (DEBUG_MODE) {
        const timestamp = new Date().toISOString();
        console.log(`🌐 [THIRD-PARTY DEBUG ${timestamp}] ${message}`);
        if (data) {
            console.log('📊 Third-Party Data:', JSON.stringify(data, null, 2));
        }
    }
}

class ThirdPartyAudio {
    constructor() {
        this.tempDir = path.join(__dirname, '../../temp');
        this.ensureTempDir();
        
        // List of third-party audio sources
        this.audioSources = [
            {
                name: 'Freesound',
                searchUrl: 'https://freesound.org/search/',
                enabled: true
            },
            {
                name: 'Zapsplat',
                searchUrl: 'https://www.zapsplat.com/search/',
                enabled: false // Requires API key
            },
            {
                name: 'BBC Sound Effects',
                searchUrl: 'https://sound-effects.bbcrewind.co.uk/search',
                enabled: true
            },
            {
                name: 'Archive.org',
                searchUrl: 'https://archive.org/search.php',
                enabled: true
            }
        ];
    }

    ensureTempDir() {
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
            debugLog(`Created temp directory: ${this.tempDir}`);
        }
    }

    async searchAndDownloadAudio(query, options = {}) {
        try {
            debugLog(`Searching for audio: ${query}`);
            
            // Try Archive.org first (most reliable for music)
            let audioUrl = await this.searchArchiveOrg(query);
            
            // Fallback to BBC Sound Effects
            if (!audioUrl) {
                audioUrl = await this.searchBBCSoundEffects(query);
            }
            
            // Fallback to Freesound
            if (!audioUrl) {
                audioUrl = await this.searchFreesound(query);
            }
            
            if (audioUrl) {
                debugLog(`Found audio URL: ${audioUrl}`);
                return await this.downloadAndCreateResource(audioUrl, query);
            }
            
            debugLog(`No audio found for query: ${query}`);
            return null;
            
        } catch (error) {
            debugLog(`Error searching for audio: ${error.message}`);
            return null;
        }
    }

    async searchArchiveOrg(query) {
        try {
            debugLog(`Searching Archive.org for: ${query}`);
            
            // Try multiple search strategies
            const searchQueries = [
                query,
                query.split(' ')[0], // First word only
                'music classical',   // Generic music fallback
                'audio track',       // Generic audio fallback
                'instrumental'       // Generic instrumental
            ];
            
            for (const searchTerm of searchQueries) {
                try {
                    const searchUrl = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(searchTerm)}+AND+mediatype:audio&fl[]=identifier,title,creator,format&sort[]=downloads+desc&rows=20&page=1&output=json`;
                    
                    const response = await axios.get(searchUrl, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        },
                        timeout: 10000
                    });
                    
                    if (response.data && response.data.response && response.data.response.docs) {
                        const docs = response.data.response.docs;
                        
                        for (const doc of docs) {
                            // Look for various audio formats
                            const audioFiles = [
                                `${doc.identifier}.mp3`,
                                `${doc.identifier}.ogg`,
                                `${doc.identifier}.m4a`,
                                `${doc.identifier}.wav`
                            ];
                            
                            for (const audioFile of audioFiles) {
                                const audioUrl = `https://archive.org/download/${doc.identifier}/${audioFile}`;
                                
                                // Verify the file exists
                                try {
                                    const headResponse = await axios.head(audioUrl, { timeout: 5000 });
                                    if (headResponse.status === 200) {
                                        debugLog(`Found Archive.org audio: ${doc.title || doc.identifier} (${audioFile})`);
                                        return audioUrl;
                                    }
                                } catch (error) {
                                    continue;
                                }
                            }
                        }
                    }
                } catch (error) {
                    debugLog(`Archive.org search failed for "${searchTerm}": ${error.message}`);
                    continue;
                }
            }
            
            return null;
            
        } catch (error) {
            debugLog(`Archive.org search failed: ${error.message}`);
            return null;
        }
    }

    async searchBBCSoundEffects(query) {
        try {
            debugLog(`Searching BBC Sound Effects for: ${query}`);
            
            const searchUrl = `https://sound-effects.bbcrewind.co.uk/search?q=${encodeURIComponent(query)}`;
            
            const response = await axios.get(searchUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 10000
            });
            
            const $ = cheerio.load(response.data);
            
            // Look for download links
            const audioLinks = [];
            $('a[href$=".wav"], a[href$=".mp3"]').each((i, element) => {
                const href = $(element).attr('href');
                if (href && href.startsWith('http')) {
                    audioLinks.push(href);
                }
            });
            
            if (audioLinks.length > 0) {
                debugLog(`Found BBC Sound Effects audio: ${audioLinks[0]}`);
                return audioLinks[0];
            }
            
            return null;
            
        } catch (error) {
            debugLog(`BBC Sound Effects search failed: ${error.message}`);
            return null;
        }
    }

    async searchFreesound(query) {
        try {
            debugLog(`Searching Freesound for: ${query}`);
            
            // Note: Freesound requires API key for downloads
            // This is a basic implementation that would need API integration
            const searchUrl = `https://freesound.org/search/?q=${encodeURIComponent(query)}&f=type:wav%20OR%20type:mp3`;
            
            const response = await axios.get(searchUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 10000
            });
            
            // Freesound requires authentication for downloads
            // This would need proper API integration
            return null;
            
        } catch (error) {
            debugLog(`Freesound search failed: ${error.message}`);
            return null;
        }
    }

    async downloadAndCreateResource(audioUrl, query) {
        try {
            debugLog(`Downloading audio from: ${audioUrl}`);
            
            const response = await axios.get(audioUrl, {
                responseType: 'stream',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 30000
            });
            
            // Generate unique filename
            const timestamp = Date.now();
            const extension = path.extname(audioUrl) || '.mp3';
            const filename = `audio_${timestamp}${extension}`;
            const filepath = path.join(this.tempDir, filename);
            
            // Download file
            const writer = fs.createWriteStream(filepath);
            response.data.pipe(writer);
            
            return new Promise((resolve, reject) => {
                writer.on('finish', () => {
                    debugLog(`Audio downloaded: ${filepath}`);
                    
                    // Create audio resource
                    try {
                        const audioResource = createAudioResource(filepath, {
                            inputType: 'arbitrary',
                        });
                        
                        // Schedule cleanup after 10 minutes
                        setTimeout(() => {
                            this.cleanupFile(filepath);
                        }, 10 * 60 * 1000);
                        
                        resolve({
                            resource: audioResource,
                            filepath: filepath,
                            title: `Third-party audio: ${query}`,
                            duration: 180 // Estimated duration
                        });
                        
                    } catch (error) {
                        this.cleanupFile(filepath);
                        reject(error);
                    }
                });
                
                writer.on('error', (error) => {
                    this.cleanupFile(filepath);
                    reject(error);
                });
            });
            
        } catch (error) {
            debugLog(`Failed to download audio: ${error.message}`);
            throw error;
        }
    }

    cleanupFile(filepath) {
        try {
            if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath);
                debugLog(`Cleaned up file: ${filepath}`);
            }
        } catch (error) {
            debugLog(`Failed to cleanup file ${filepath}: ${error.message}`);
        }
    }

    async cleanupTempDir() {
        try {
            const files = fs.readdirSync(this.tempDir);
            for (const file of files) {
                const filepath = path.join(this.tempDir, file);
                const stats = fs.statSync(filepath);
                
                // Delete files older than 1 hour
                if (Date.now() - stats.mtime.getTime() > 60 * 60 * 1000) {
                    this.cleanupFile(filepath);
                }
            }
        } catch (error) {
            debugLog(`Failed to cleanup temp directory: ${error.message}`);
        }
    }

    // Generate a generic audio tone as last resort
    async generateFallbackAudio(query, frequency = 440, duration = 30) {
        try {
            debugLog(`Generating fallback audio tone for: ${query}`);
            
            const sampleRate = 44100;
            const samples = sampleRate * duration;
            const buffer = Buffer.alloc(samples * 2); // 16-bit audio
            
            for (let i = 0; i < samples; i++) {
                const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3; // 30% volume
                const intSample = Math.round(sample * 32767);
                buffer.writeInt16LE(intSample, i * 2);
            }
            
            const timestamp = Date.now();
            const filename = `fallback_${timestamp}.wav`;
            const filepath = path.join(this.tempDir, filename);
            
            // Create WAV header
            const wavHeader = Buffer.alloc(44);
            wavHeader.write('RIFF', 0);
            wavHeader.writeUInt32LE(36 + buffer.length, 4);
            wavHeader.write('WAVE', 8);
            wavHeader.write('fmt ', 12);
            wavHeader.writeUInt32LE(16, 16);
            wavHeader.writeUInt16LE(1, 20);
            wavHeader.writeUInt16LE(1, 22);
            wavHeader.writeUInt32LE(sampleRate, 24);
            wavHeader.writeUInt32LE(sampleRate * 2, 28);
            wavHeader.writeUInt16LE(2, 32);
            wavHeader.writeUInt16LE(16, 34);
            wavHeader.write('data', 36);
            wavHeader.writeUInt32LE(buffer.length, 40);
            
            const wavFile = Buffer.concat([wavHeader, buffer]);
            fs.writeFileSync(filepath, wavFile);
            
            const audioResource = createAudioResource(filepath, {
                inputType: 'arbitrary',
            });
            
            // Schedule cleanup
            setTimeout(() => {
                this.cleanupFile(filepath);
            }, 5 * 60 * 1000);
            
            return {
                resource: audioResource,
                filepath: filepath,
                title: `Fallback tone for: ${query}`,
                duration: duration
            };
            
        } catch (error) {
            debugLog(`Failed to generate fallback audio: ${error.message}`);
            return null;
        }
    }
}

module.exports = ThirdPartyAudio;
