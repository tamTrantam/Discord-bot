const { Client, GatewayIntentBits, Collection, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Debug mode from environment
const DEBUG_MODE = process.env.DEBUG_MODE === 'true';

// Debug logging function
function debugLog(message, data = null) {
    if (DEBUG_MODE) {
        const timestamp = new Date().toISOString();
        console.log(`🐛 [DEBUG ${timestamp}] ${message}`);
        if (data) {
            console.log('📊 Data:', JSON.stringify(data, null, 2));
        }
    }
}

// Create Discord client with necessary intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
    ],
});

// Add debug logging to client
client.debugLog = debugLog;

// Initialize collections for commands and music queues
client.commands = new Collection();
client.musicQueues = new Collection();
client.musicBindings = new Map();
client.searchSessions = new Map();
client.updateIntervals = new Map();

// Load command files
const commandsPath = path.join(__dirname, 'src', 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        console.log(`✅ Loaded command: ${command.data.name}`);
    } else {
        console.log(`⚠️ Command at ${filePath} is missing required "data" or "execute" property.`);
    }
}

// Load event files
const eventsPath = path.join(__dirname, 'src', 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
    console.log(`✅ Loaded event: ${event.name}`);
}

// Handle command interactions
client.on('interactionCreate', async interaction => {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            debugLog(`Command not found: ${interaction.commandName}`, {
                user: interaction.user.tag,
                guild: interaction.guild?.name,
                channel: interaction.channel?.name
            });
            return;
        }

        debugLog(`Executing command: ${interaction.commandName}`, {
            user: interaction.user.tag,
            guild: interaction.guild?.name,
            channel: interaction.channel?.name,
            options: interaction.options.data
        });

        const startTime = Date.now();

        try {
            await command.execute(interaction);
            
            const executionTime = Date.now() - startTime;
            debugLog(`Command executed successfully in ${executionTime}ms: ${interaction.commandName}`);
            
        } catch (error) {
            const executionTime = Date.now() - startTime;
            console.error(`Error executing command ${interaction.commandName} (${executionTime}ms):`, error);
            debugLog(`Command execution failed: ${interaction.commandName}`, {
                error: error.message,
                stack: error.stack,
                executionTime
            });
            
            const errorMessage = {
                content: DEBUG_MODE ? 
                    `❌ Error: ${error.message}\n\`\`\`${error.stack?.slice(0, 500)}...\`\`\`` :
                    'There was an error while executing this command!',
                flags: MessageFlags.Ephemeral
            };

            // Safe interaction response - check state before responding
            try {
                if (interaction.replied || interaction.deferred) {
                    // Interaction already handled - do nothing to avoid double acknowledgment
                    debugLog('Interaction already handled, skipping error response');
                } else {
                    // Interaction not yet responded to - use reply (safest option)
                    await interaction.reply(errorMessage);
                }
            } catch (responseError) {
                // If we still can't respond, log it but don't crash
                console.error('Failed to send error response to interaction:', responseError.message);
                debugLog('Error response failed', {
                    originalError: error.message,
                    responseError: responseError.message,
                    interactionState: {
                        replied: interaction.replied,
                        deferred: interaction.deferred
                    }
                });
            }
        }
    }
    
    // Handle button interactions - optimized for speed
    else if (interaction.isButton()) {
        debugLog(`Button interaction: ${interaction.customId}`, {
            user: interaction.user.tag,
            guild: interaction.guild?.name,
            channel: interaction.channel?.name
        });

        try {
            // Fast routing for search interactions
            if (interaction.customId.startsWith('search_')) {
                const searchCommand = interaction.client.commands.get('search');
                if (searchCommand) {
                    return searchCommand.handleSearchInteraction(interaction, interaction.client, interaction.customId);
                }
            }

            // Handle music search button from bound channel
            if (interaction.customId === 'music_search') {
                try {
                    // Create a modal for search input - PRODUCTION OPTIMIZED
                    const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
                    
                    const modal = new ModalBuilder()
                        .setCustomId('search_modal')
                        .setTitle('🔍 Search for Music');

                    const searchInput = new TextInputBuilder()
                        .setCustomId('search_query')
                        .setLabel('Song name, artist, or keywords')
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder('e.g. "Bohemian Rhapsody Queen" or "relaxing piano music"')
                        .setRequired(true)
                        .setMaxLength(100);

                    const firstActionRow = new ActionRowBuilder().addComponents(searchInput);
                    modal.addComponents(firstActionRow);

                    // PRODUCTION FIX: Add immediate return without await to prevent timing issues
                    interaction.showModal(modal).catch(modalError => {
                        console.log('Modal show failed in production:', modalError.message);
                        // Don't try to reply here - interaction might be consumed
                    });
                    return; // Exit immediately to prevent double handling
                } catch (error) {
                    console.log('Error creating search modal:', error.message);
                    // Only reply if interaction hasn't been consumed
                    if (!interaction.replied && !interaction.deferred) {
                        try {
                            return await interaction.reply({
                                content: '❌ Failed to open search interface. Please try the `/search` command instead.',
                                flags: MessageFlags.Ephemeral
                            });
                        } catch (replyError) {
                            console.log('Could not reply to modal error:', replyError.message);
                        }
                    }
                }
            }

            const guildId = interaction.guild.id;
            const musicQueue = interaction.client.musicQueues.get(guildId);

            // Check if user is in a voice channel for music controls
            const musicControls = [
                'music_play_pause', 'music_toggle_playback', 'toggle_playback', 'music_skip', 'skip_song', 
                'music_stop', 'stop_music', 'music_shuffle', 'shuffle_queue', 
                'music_loop', 'toggle_loop', 'music_clear', 'clear_queue',
                'music_volume_up', 'music_volume_down', 'volume_up', 'volume_down',
                'music_queue', 'music_nowplaying'
            ];

            if (musicControls.includes(interaction.customId)) {
                if (!interaction.member.voice.channel) {
                    return interaction.reply({
                        content: '❌ You must be in a voice channel to control music!',
                        flags: MessageFlags.Ephemeral
                    });
                }

                if (!musicQueue) {
                    return interaction.reply({
                        content: '❌ No active music session found!',
                        flags: MessageFlags.Ephemeral
                    });
                }

                // Check if user is in the same voice channel as the bot
                if (musicQueue.voiceChannel && musicQueue.voiceChannel.id !== interaction.member.voice.channel.id) {
                    return interaction.reply({
                        content: '❌ You must be in the same voice channel as the bot!',
                        flags: MessageFlags.Ephemeral
                    });
                }
            }

            // Map music_ prefixed buttons to their regular counterparts
            const buttonMap = {
                'music_toggle_playback': 'toggle_playback',
                'music_skip': 'skip_song',
                'music_stop': 'stop_music',
                'music_shuffle': 'shuffle_queue',
                'music_loop': 'toggle_loop',
                'music_clear': 'clear_queue',
                'music_volume_up': 'volume_up',
                'music_volume_down': 'volume_down'
            };

            const actualCustomId = buttonMap[interaction.customId] || interaction.customId;

            switch (actualCustomId) {
                case 'queue_refresh':
                    // Re-run the queue command
                    const queueCommand = interaction.client.commands.get('queue');
                    if (queueCommand) {
                        await queueCommand.execute(interaction);
                    }
                    break;

                case 'toggle_playback':
                    if (musicQueue.isPlaying) {
                        musicQueue.pause();
                        await interaction.reply({
                            content: '⏸️ Music paused!',
                            flags: MessageFlags.Ephemeral
                        });
                    } else {
                        musicQueue.resume();
                        await interaction.reply({
                            content: '▶️ Music resumed!',
                            flags: MessageFlags.Ephemeral
                        });
                    }
                    break;

                case 'skip_song':
                    if (musicQueue.songs.length > 1) {
                        const currentSong = musicQueue.songs[0];
                        musicQueue.skip();
                        await interaction.reply({
                            content: `⏭️ Skipped: **${currentSong.title}**`,
                            flags: MessageFlags.Ephemeral
                        });
                    } else {
                        await interaction.reply({
                            content: '❌ No more songs in queue to skip!',
                            flags: MessageFlags.Ephemeral
                        });
                    }
                    break;

                case 'stop_music':
                    musicQueue.stop();
                    await interaction.reply({
                        content: '⏹️ Music stopped and queue cleared!',
                        flags: MessageFlags.Ephemeral
                    });
                    break;

                case 'shuffle_queue':
                    if (musicQueue.songs.length > 2) {
                        musicQueue.shuffle();
                        await interaction.reply({
                            content: '🔀 Queue shuffled!',
                            flags: MessageFlags.Ephemeral
                        });
                    } else {
                        await interaction.reply({
                            content: '❌ Need at least 2 songs in queue to shuffle!',
                            flags: MessageFlags.Ephemeral
                        });
                    }
                    break;

                case 'toggle_loop':
                    musicQueue.setLoop(!musicQueue.loop);
                    await interaction.reply({
                        content: `🔁 Loop ${musicQueue.loop ? 'enabled' : 'disabled'}!`,
                        flags: MessageFlags.Ephemeral
                    });
                    break;

                case 'clear_queue':
                    if (musicQueue.songs.length > 1) {
                        const clearedCount = musicQueue.songs.length - 1;
                        musicQueue.clear();
                        await interaction.reply({
                            content: `🗑️ Cleared ${clearedCount} songs from queue!`,
                            flags: MessageFlags.Ephemeral
                        });
                    } else {
                        await interaction.reply({
                            content: '❌ Queue is already empty!',
                            flags: MessageFlags.Ephemeral
                        });
                    }
                    break;

                case 'volume_menu':
                    await interaction.reply({
                        content: `🔊 Current volume: **${musicQueue.volume}%**\n` +
                                `Use \`/volume\` command to adjust volume (0-100).`,
                        flags: MessageFlags.Ephemeral
                    });
                    break;

                case 'volume_up':
                    const newVolumeUp = Math.min(100, musicQueue.volume + 10);
                    musicQueue.setVolume(newVolumeUp);
                    await interaction.reply({
                        content: `🔊 Volume increased to **${newVolumeUp}%**`,
                        flags: MessageFlags.Ephemeral
                    });
                    break;

                case 'volume_down':
                    const newVolumeDown = Math.max(0, musicQueue.volume - 10);
                    musicQueue.setVolume(newVolumeDown);
                    await interaction.reply({
                        content: `🔉 Volume decreased to **${newVolumeDown}%**`,
                        flags: MessageFlags.Ephemeral
                    });
                    break;

                case 'music_queue':
                    // Show queue using the queue command
                    const queueCmd = interaction.client.commands.get('queue');
                    if (queueCmd) {
                        await queueCmd.execute(interaction);
                    } else {
                        await interaction.reply({
                            content: '❌ Queue command not available.',
                            flags: MessageFlags.Ephemeral
                        });
                    }
                    break;

                case 'music_nowplaying':
                    // Show now playing using the nowplaying command
                    const nowPlayingCmd = interaction.client.commands.get('nowplaying');
                    if (nowPlayingCmd) {
                        await nowPlayingCmd.execute(interaction);
                    } else {
                        await interaction.reply({
                            content: '❌ Now playing command not available.',
                            flags: MessageFlags.Ephemeral
                        });
                    }
                    break;

                default:
                    await interaction.reply({
                        content: '❌ Unknown button interaction!',
                        flags: MessageFlags.Ephemeral
                    });
            }

            // Update control panel if bound (for music controls)
            if (musicControls.includes(interaction.customId)) {
                const bindCommand = interaction.client.commands.get('bind');
                if (bindCommand) {
                    setTimeout(() => bindCommand.updateControlPanel(interaction.client, guildId), 1000);
                }
            }

        } catch (error) {
            console.error('Button interaction error:', error);
            debugLog(`Button interaction failed: ${interaction.customId}`, {
                error: error.message,
                stack: error.stack
            });

            const errorMessage = {
                content: DEBUG_MODE ? 
                    `❌ Button Error: ${error.message}` :
                    'There was an error processing this button!',
                flags: MessageFlags.Ephemeral
            };

            // Safe interaction response - check state before responding
            try {
                if (interaction.replied) {
                    // Interaction already replied to - do nothing
                    debugLog('Button interaction already replied to, skipping error response');
                } else if (interaction.deferred) {
                    // Interaction was deferred - use followUp
                    await interaction.followUp(errorMessage);
                } else {
                    // Interaction not yet responded to - use reply
                    await interaction.reply(errorMessage);
                }
            } catch (responseError) {
                // If we still can't respond, log it but don't crash
                console.error('Failed to send button error response:', responseError.message);
                debugLog('Button error response failed', {
                    originalError: error.message,
                    responseError: responseError.message,
                    interactionState: {
                        replied: interaction.replied,
                        deferred: interaction.deferred
                    }
                });
            }
        }
    }
    
    // Handle modal submissions - optimized for speed
    else if (interaction.isModalSubmit()) {
        if (interaction.customId === 'search_modal') {
            const query = interaction.fields.getTextInputValue('search_query');
            
            // Direct modal handling for better performance
            try {
                // IMMEDIATELY defer to prevent timeout during search
                await interaction.deferReply();
                
                const searchCommand = interaction.client.commands.get('search');
                if (searchCommand) {
                    // Perform search directly
                    const results = await searchCommand.searchMusic(query);
                    
                    if (results.length === 0) {
                        return await interaction.editReply({
                            content: `❌ No results found for: **${query}**`
                        });
                    }

                    // Create session for search results
                    if (!interaction.client.searchSessions) {
                        interaction.client.searchSessions = new Map();
                    }

                    const sessionId = `${interaction.user.id}_${Date.now()}`;
                    console.log(`🔍 [SEARCH DEBUG] Creating session: ${sessionId}`);
                    interaction.client.searchSessions.set(sessionId, {
                        userId: interaction.user.id,
                        query: query,
                        results: results,
                        currentPage: 0,
                        timestamp: Date.now()
                    });
                    console.log(`🔍 [SEARCH DEBUG] Session created. Total sessions: ${interaction.client.searchSessions.size}`);

                    // Create search interface directly
                    const embed = await searchCommand.createSearchEmbed(results, query, 0, results.length);
                    const pageResults = results.slice(0, 3);
                    const buttonRows = searchCommand.createSearchButtons(pageResults, sessionId, 0, results.length);

                    await interaction.editReply({
                        embeds: [embed],
                        components: buttonRows
                    });

                    console.log(`🔍 [SEARCH] Modal search completed for "${query}" - ${results.length} results`);
                    
                    // Start session cleanup
                    setTimeout(() => {
                        if (searchCommand.cleanupOldSessions) {
                            searchCommand.cleanupOldSessions(interaction.client);
                        }
                    }, 60000); // Clean up after 1 minute
                    
                } else {
                    await interaction.editReply({
                        content: '❌ Search command not available.'
                    });
                }
            } catch (error) {
                console.log('Modal search error:', error.message);
                try {
                    await interaction.editReply({
                        content: `❌ Search failed: ${error.message}`
                    });
                } catch (editError) {
                    console.log('Could not edit modal reply:', editError.message);
                }
            }
        }
    }
});

// Global error handlers to prevent crashes
process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
    debugLog('Unhandled Promise Rejection', {
        reason: reason?.message || reason,
        stack: reason?.stack
    });
});

process.on('uncaughtException', (error) => {
    console.error('🚨 Uncaught Exception:', error);
    debugLog('Uncaught Exception', {
        error: error.message,
        stack: error.stack
    });
    // Don't exit on uncaught exceptions in production
    if (process.env.NODE_ENV !== 'production') {
        process.exit(1);
    }
});

// Add error handler for Discord client
client.on('error', (error) => {
    console.error('🚨 Discord Client Error:', error);
    debugLog('Discord Client Error', {
        error: error.message,
        stack: error.stack
    });
});

// Login to Discord
client.login(process.env.DISCORD_TOKEN)
    .then(() => {
        console.log('🤖 Bot logged in successfully!');
    })
    .catch(error => {
        console.error('❌ Failed to login:', error);
        process.exit(1);
    });

// HTTP Server for cloud deployment port binding
const http = require('http');
const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        status: 'online',
        bot: 'Discord Music Bot v2.0',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        servers: client.guilds.cache.size || 0
    }));
});

server.listen(PORT, () => {
    console.log(`🌐 HTTP server listening on port ${PORT}`);
    console.log(`📊 Health check available at http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('🛑 Shutting down gracefully...');
    server.close(() => {
        client.destroy();
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('🛑 Received SIGTERM, shutting down...');
    server.close(() => {
        client.destroy();
        process.exit(0);
    });
});

module.exports = client;
