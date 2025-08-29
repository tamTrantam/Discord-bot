const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const MusicQueue = require('../utils/MusicQueue');
const YouTubeUtils = require('../utils/YouTubeUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a song from YouTube')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Song name or YouTube URL')
                .setRequired(true)),

    async execute(interaction) {
        const startTime = Date.now();
        
        try {
            // Check if user is in a voice channel
            const voiceChannel = interaction.member.voice.channel;
            if (!voiceChannel) {
                return interaction.reply({
                    content: '❌ You need to be in a voice channel to play music!',
                    ephemeral: true
                });
            }

            // Check bot permissions
            const permissions = voiceChannel.permissionsFor(interaction.client.user);
            if (!permissions.has(['Connect', 'Speak'])) {
                return interaction.reply({
                    content: '❌ I need permission to connect and speak in your voice channel!',
                    ephemeral: true
                });
            }

            // Only defer if not already replied/deferred
            if (!interaction.replied && !interaction.deferred) {
                await interaction.deferReply();
                
                const deferTime = Date.now() - startTime;
                interaction.client.debugLog?.(`Play command deferred in ${deferTime}ms`, {
                    user: interaction.user.tag,
                    guild: interaction.guild.name,
                    channel: voiceChannel.name
                });
            }

            const query = interaction.options.getString('query');
            const guildId = interaction.guild.id;

            // Get or create music queue for this guild
            let musicQueue = interaction.client.musicQueues.get(guildId);
            if (!musicQueue) {
                musicQueue = new MusicQueue(guildId);
                interaction.client.musicQueues.set(guildId, musicQueue);
            }

            // Connect to voice channel if not already connected
            if (!musicQueue.connection) {
                try {
                    await musicQueue.connect(voiceChannel);
                } catch (error) {
                    console.error('Failed to join voice channel:', error);
                    return interaction.editReply({
                        content: '❌ Failed to join voice channel!'
                    });
                }
            }

            try {
                const videoInfoStartTime = Date.now();
                
                // Check if it's a playlist
                if (YouTubeUtils.isPlaylist(query)) {
                    interaction.client.debugLog?.(`Processing playlist: ${query}`);
                    
                    const songs = await YouTubeUtils.getPlaylistInfo(query);
                    const playlistTime = Date.now() - videoInfoStartTime;
                    
                    interaction.client.debugLog?.(`Playlist processed in ${playlistTime}ms`, {
                        songsFound: songs.length,
                        processingTime: playlistTime
                    });
                    
                    if (songs.length === 0) {
                        return interaction.editReply({
                            content: '❌ No songs found in playlist!'
                        });
                    }

                    // Add all songs to queue
                    let addedCount = 0;
                    for (const songInfo of songs.slice(0, 50)) { // Limit to 50 songs
                        songInfo.requestedBy = interaction.user;
                        await musicQueue.addSong(songInfo);
                        addedCount++;
                    }

                    const embed = new EmbedBuilder()
                        .setColor('#00ff00')
                        .setTitle('📋 Playlist Added')
                        .setDescription(`Added **${addedCount}** songs to the queue`)
                        .setFooter({ text: `Requested by ${interaction.user.displayName}` });

                    const totalTime = Date.now() - startTime;
                    interaction.client.debugLog?.(`Playlist command completed in ${totalTime}ms`, {
                        totalTime,
                        songsAdded: addedCount
                    });

                    await interaction.editReply({ embeds: [embed] });

                } else {
                    // Single song - use improved search that excludes Shorts
                    console.log(`🎵 [PLAY DEBUG] === STARTING SINGLE SONG PROCESSING ===`);
                    console.log(`🎵 [PLAY DEBUG] Query: "${query}"`);
                    console.log(`🎵 [PLAY DEBUG] User: ${interaction.user.tag}`);
                    console.log(`🎵 [PLAY DEBUG] Guild: ${interaction.guild.name}`);
                    
                    interaction.client.debugLog?.(`Processing single song: ${query}`);
                    
                    let songInfo;
                    
                    console.log(`🎵 [PLAY DEBUG] Checking if query is URL...`);
                    const isURL = YouTubeUtils.validateURL(query);
                    console.log(`🎵 [PLAY DEBUG] Is URL: ${isURL}`);
                    
                    if (isURL) {
                        // Direct URL - get video info directly
                        console.log(`🎵 [PLAY DEBUG] Processing direct URL...`);
                        songInfo = await YouTubeUtils.getVideoInfo(query);
                        console.log(`🎵 [PLAY DEBUG] ✅ Direct URL processed successfully`);
                    } else {
                        // Search query - use advanced search to avoid Shorts
                        console.log(`🎵 [PLAY DEBUG] Processing search query...`);
                        const utils = new YouTubeUtils();
                        
                        console.log(`🎵 [PLAY DEBUG] Calling searchVideosAdvanced...`);
                        const searchResults = await utils.searchVideosAdvanced(query, {
                            limit: 1,
                            excludeShorts: true,
                            preferMusic: true,
                            minDuration: 61 // Exclude videos shorter than 61 seconds
                        });
                        console.log(`🎵 [PLAY DEBUG] Search results count: ${searchResults.length}`);
                        
                        if (searchResults.length === 0) {
                            console.log(`🎵 [PLAY DEBUG] ❌ No search results found`);
                            return interaction.editReply({
                                content: '❌ No suitable songs found! Try a different search term or provide a direct YouTube URL.'
                            });
                        }
                        
                        console.log(`🎵 [PLAY DEBUG] First result: ${searchResults[0].title} (${searchResults[0].url})`);
                        
                        // Get detailed info for the first result
                        console.log(`🎵 [PLAY DEBUG] Getting detailed video info...`);
                        songInfo = await YouTubeUtils.getVideoInfo(searchResults[0].url);
                        console.log(`🎵 [PLAY DEBUG] ✅ Search result processed successfully`);
                    }
                    
                    const videoInfoTime = Date.now() - videoInfoStartTime;
                    
                    interaction.client.debugLog?.(`Video info retrieved in ${videoInfoTime}ms`, {
                        title: songInfo.title,
                        duration: songInfo.duration,
                        processingTime: videoInfoTime,
                        isShort: songInfo.duration <= 60
                    });
                    
                    // Additional check to prevent Shorts
                    if (songInfo.duration > 0 && songInfo.duration <= 60) {
                        return interaction.editReply({
                            content: '❌ This appears to be a YouTube Short. Please search for a full-length song or provide a different URL.'
                        });
                    }
                    
                    songInfo.requestedBy = interaction.user;

                    // Check song duration (optional limit)
                    const maxDuration = parseInt(process.env.MAX_SONG_DURATION) || 3600;
                    if (songInfo.duration > maxDuration) {
                        return interaction.editReply({
                            content: `❌ Song is too long! Maximum duration is ${Math.floor(maxDuration / 60)} minutes.`
                        });
                    }

                    const song = await musicQueue.addSong(songInfo);

                    const embed = new EmbedBuilder()
                        .setColor('#00ff00')
                        .setTitle('🎵 Song Added to Queue')
                        .setDescription(`**[${song.title}](${song.url})**`)
                        .addFields(
                            { name: '⏱️ Duration', value: YouTubeUtils.formatDuration(song.duration), inline: true },
                            { name: '👤 Requested by', value: interaction.user.displayName, inline: true },
                            { name: '📊 Position', value: `${musicQueue.songs.length}`, inline: true }
                        )
                        .setThumbnail(song.thumbnail)
                        .setFooter({ text: `Queue length: ${musicQueue.songs.length}` });

                    const totalTime = Date.now() - startTime;
                    interaction.client.debugLog?.(`Single song command completed in ${totalTime}ms`, {
                        totalTime,
                        videoInfoTime,
                        title: song.title
                    });

                    await interaction.editReply({ embeds: [embed] });
                }

                // Start playing if this is the first song
                if (musicQueue.songs.length === 1 && !musicQueue.playing) {
                    musicQueue.play();
                }

            } catch (error) {
                console.error('Error processing song:', error);
                await interaction.editReply({
                    content: '❌ Failed to process the song. Please try again or use a different URL.'
                });
            }

        } catch (error) {
            console.error('Error in play command:', error);
            
            const errorMessage = {
                content: '❌ An error occurred while processing your request.',
                ephemeral: true
            };

            if (interaction.deferred || interaction.replied) {
                await interaction.editReply(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        }
    },
};
