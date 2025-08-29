const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bind')
        .setDescription('Bind the music control panel to this channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const channelId = interaction.channel.id;
        
        // IMMEDIATE response to prevent timeout - no processing before this!
        await interaction.reply({ 
            content: '🔄 Setting up music control panel...', 
            flags: MessageFlags.Ephemeral
        });
        
        try {
            // Store the binding information first (fast operation)
            if (!interaction.client.musicBindings) {
                interaction.client.musicBindings = new Map();
            }
            
            // Clear existing binding and interval for this guild
            const existingBinding = interaction.client.musicBindings.get(guildId);
            if (existingBinding && interaction.client.bindingIntervals?.has(guildId)) {
                clearInterval(interaction.client.bindingIntervals.get(guildId));
            }
            
            interaction.client.musicBindings.set(guildId, {
                channelId: channelId,
                messageId: null
            });

            // Quick cleanup (limit to 10 messages max to stay fast)
            try {
                const messages = await interaction.channel.messages.fetch({ limit: 10 });
                const deletePromises = [];
                
                for (const message of messages.values()) {
                    // Only delete bot messages
                    if (message.author.id === interaction.client.user.id) {
                        deletePromises.push(
                            message.delete().catch(() => {}) // Ignore individual failures
                        );
                    }
                }
                
                // Delete in parallel for speed
                if (deletePromises.length > 0) {
                    await Promise.allSettled(deletePromises);
                    console.log(`🧹 [BIND] Cleared ${deletePromises.length} old messages`);
                }
            } catch (fetchError) {
                console.log('🧹 [BIND] Could not fetch messages for cleanup:', fetchError.message);
            }

            // Create the control panel
            const controlPanel = await createFancyControlPanel(interaction.client, guildId);
            const message = await interaction.channel.send(controlPanel);
            
            // Store message ID for updates
            interaction.client.musicBindings.get(guildId).messageId = message.id;
            
            // Start periodic updates
            if (!interaction.client.bindingIntervals) {
                interaction.client.bindingIntervals = new Map();
            }
            
            // Set new interval for updates every 15 seconds
            const interval = setInterval(async () => {
                await updateFancyControlPanel(interaction.client, guildId);
            }, 15000);
            
            interaction.client.bindingIntervals.set(guildId, interval);
            
            // Success follow-up
            await interaction.followUp({
                content: '✅ **Music Control Panel** has been bound to this channel!\n🎛️ The control panel will stay updated automatically.',
                flags: MessageFlags.Ephemeral
            });
            
        } catch (error) {
            console.error('Error in bind command:', error);
            
            // Safe error response
            try {
                await interaction.followUp({
                    content: `❌ Failed to bind control panel: ${error.message}`,
                    flags: MessageFlags.Ephemeral
                });
            } catch (followUpError) {
                console.error('Failed to send error follow-up:', followUpError);
            }
        }
    }
};

function createFancyControlPanel(client, guildId) {
    const musicQueue = client.musicQueues?.get(guildId);
    const currentSong = musicQueue?.currentSong;
    const queue = musicQueue?.songs || [];
    const isPlaying = musicQueue?.playing || false; // Fixed: use 'playing' instead of 'isPlaying'
    const isPaused = musicQueue?.isPaused || false;
    const isLooping = musicQueue?.loop || false;

    // Create fancy embed
    const embed = new EmbedBuilder()
        .setColor(isPlaying ? '#00ff41' : isPaused ? '#ffaa00' : '#ff0040')
        .setTitle('🎛️ **MUSIC CONTROL PANEL** 🎛️')
        .setTimestamp()
        .setFooter({ 
            text: '🎵 Enhanced Music Bot • Made with ❤️',
            iconURL: 'https://cdn.discordapp.com/emojis/741092950065823887.gif'
        });

    if (currentSong) {
        // Format duration properly
        const duration = formatDuration(currentSong.duration);
        const requester = currentSong.requestedBy?.displayName || 
                         currentSong.requestedBy?.globalName || 
                         currentSong.requestedBy?.username || 
                         'Unknown User';

        embed.addFields(
            {
                name: '🎵 **NOW PLAYING**',
                value: `**[\`${currentSong.title}\`](${currentSong.url})**\n` +
                       `⏱️ \`${duration}\` • 👤 **${requester}**`,
                inline: false
            },
            {
                name: '📊 **STATUS**',
                value: `${getStatusIcon(isPlaying, isPaused)} **${getStatusText(isPlaying, isPaused)}**` +
                       `${isLooping ? '\n🔁 **Loop:** `ON`' : ''}`,
                inline: true
            },
            {
                name: '📋 **QUEUE**',
                value: `**\`${queue.length}\`** songs in queue`,
                inline: true
            }
        );

        if (currentSong.thumbnail) {
            embed.setThumbnail(currentSong.thumbnail);
        }
    } else {
        embed.addFields({
            name: '💤 **NO MUSIC PLAYING**',
            value: '```\nUse the search button below or /play command\nto start playing music!\n```',
            inline: false
        });
    }

    // Create fancy buttons with better styling
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('music_play_pause')
            .setLabel(isPaused ? 'Resume' : isPlaying ? 'Pause' : 'Play')
            .setEmoji(isPaused ? '▶️' : isPlaying ? '⏸️' : '▶️')
            .setStyle(isPlaying ? ButtonStyle.Success : ButtonStyle.Primary),
        
        new ButtonBuilder()
            .setCustomId('music_skip')
            .setLabel('Skip')
            .setEmoji('⏭️')
            .setStyle(ButtonStyle.Secondary),
        
        new ButtonBuilder()
            .setCustomId('music_stop')
            .setLabel('Stop')
            .setEmoji('⏹️')
            .setStyle(ButtonStyle.Danger),
        
        new ButtonBuilder()
            .setCustomId('music_search')
            .setLabel('Search')
            .setEmoji('🔍')
            .setStyle(ButtonStyle.Primary),
        
        new ButtonBuilder()
            .setCustomId('music_queue')
            .setLabel('Queue')
            .setEmoji('📋')
            .setStyle(ButtonStyle.Secondary)
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('music_shuffle')
            .setLabel('Shuffle')
            .setEmoji('🔀')
            .setStyle(ButtonStyle.Secondary),
        
        new ButtonBuilder()
            .setCustomId('music_loop')
            .setLabel('Loop')
            .setEmoji('🔁')
            .setStyle(isLooping ? ButtonStyle.Success : ButtonStyle.Secondary),
        
        new ButtonBuilder()
            .setCustomId('music_volume')
            .setLabel('Volume')
            .setEmoji('🔊')
            .setStyle(ButtonStyle.Secondary),
        
        new ButtonBuilder()
            .setCustomId('music_nowplaying')
            .setLabel('Now Playing')
            .setEmoji('🎶')
            .setStyle(ButtonStyle.Primary)
    );

    return {
        embeds: [embed],
        components: [row1, row2]
    };
}

async function updateFancyControlPanel(client, guildId) {
    try {
        const binding = client.musicBindings?.get(guildId);
        if (!binding) return;

        const channel = client.channels.cache.get(binding.channelId);
        if (!channel) return;

        let message;
        try {
            message = await channel.messages.fetch(binding.messageId);
        } catch (error) {
            // Message was deleted - don't create a new one automatically
            // This prevents duplicate panels
            console.log(`🔍 [BIND] Control panel message not found for guild ${guildId}, skipping update`);
            return;
        }

        // Update the existing message only
        const updatedPanel = createFancyControlPanel(client, guildId);
        await message.edit(updatedPanel);

    } catch (error) {
        console.error('Error updating control panel:', error);
    }
}

function formatDuration(seconds) {
    if (!seconds || seconds === 0) return '0:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function getStatusIcon(isPlaying, isPaused) {
    if (isPaused) return '⏸️';
    if (isPlaying) return '▶️';
    return '⏹️';
}

function getStatusText(isPlaying, isPaused) {
    if (isPaused) return 'PAUSED';
    if (isPlaying) return 'PLAYING';
    return 'STOPPED';
}

// Export update function for use in other files
module.exports.updateFancyControlPanel = updateFancyControlPanel;
module.exports.updateControlPanel = updateFancyControlPanel; // Legacy name compatibility
