const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bind')
        .setDescription('Bind the music control panel to this channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const channelId = interaction.channel.id;
        
        // Use modern ephemeral syntax instead of deprecated flags
        await interaction.deferReply({ ephemeral: true });
        
        // Clear the channel first (remove old messages)
        try {
            const messages = await interaction.channel.messages.fetch({ limit: 100 });
            let deleteCount = 0;
            
            for (const message of messages.values()) {
                // Delete bot messages and old control panels
                if (message.author.id === interaction.client.user.id) {
                    try {
                        await message.delete();
                        deleteCount++;
                        // Small delay to avoid rate limits
                        await new Promise(resolve => setTimeout(resolve, 100));
                    } catch (deleteError) {
                        // Ignore individual message deletion errors
                    }
                }
                
                // Also delete command messages (messages starting with /) to keep channel clean
                if (message.content.startsWith('/') || message.content.startsWith('!')) {
                    try {
                        await message.delete();
                        deleteCount++;
                        await new Promise(resolve => setTimeout(resolve, 100));
                    } catch (deleteError) {
                        // Ignore deletion errors
                    }
                }
            }
            
            if (deleteCount > 0) {
                console.log(`🧹 [BIND] Cleared ${deleteCount} old messages before binding`);
            }
        } catch (fetchError) {
            console.log('🧹 [BIND] Could not fetch messages for cleanup:', fetchError.message);
        }
        
        // Store the binding information
        if (!interaction.client.musicBindings) {
            interaction.client.musicBindings = new Map();
        }
        
        interaction.client.musicBindings.set(guildId, {
            channelId: channelId,
            messageId: null
        });

        // Create the fancy control panel
        const controlPanel = await createFancyControlPanel(interaction.client, guildId);
        const message = await interaction.channel.send(controlPanel);
        
        // Store message ID for updates
        interaction.client.musicBindings.get(guildId).messageId = message.id;
        
        // Start periodic updates
        if (!interaction.client.bindingIntervals) {
            interaction.client.bindingIntervals = new Map();
        }
        
        // Clear existing interval if any
        if (interaction.client.bindingIntervals.has(guildId)) {
            clearInterval(interaction.client.bindingIntervals.get(guildId));
        }
        
        // Set new interval for updates every 10 seconds
        const interval = setInterval(async () => {
            await updateFancyControlPanel(interaction.client, guildId);
        }, 10000);
        
        interaction.client.bindingIntervals.set(guildId, interval);
        
        // Perform initial cleanup after control panel is created
        setTimeout(async () => {
            await forceCleanup(interaction.client, guildId);
        }, 2000);
        
        await interaction.editReply({
            content: '✅ **Music Control Panel** has been bound to this channel!\n🎛️ The control panel will stay updated automatically.',
        });
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
            // Message was deleted, create a new one
            const controlPanel = createFancyControlPanel(client, guildId);
            const newMessage = await channel.send(controlPanel);
            binding.messageId = newMessage.id;
            return;
        }

        // Update the existing message
        const updatedPanel = createFancyControlPanel(client, guildId);
        await message.edit(updatedPanel);

    } catch (error) {
        console.error('Error updating control panel:', error);
    }
}

async function forceCleanup(client, guildId) {
    try {
        const binding = client.musicBindings?.get(guildId);
        if (!binding) return;

        const channel = client.channels.cache.get(binding.channelId);
        if (!channel) return;

        // Clean up any extra messages in the channel (keep only the control panel)
        const messages = await channel.messages.fetch({ limit: 50 });
        const controlPanelMessageId = binding.messageId;
        
        let deleteCount = 0;
        for (const message of messages.values()) {
            // Don't delete the control panel message
            if (message.id === controlPanelMessageId) continue;
            
            // Delete bot messages that aren't the control panel
            if (message.author.id === client.user.id) {
                try {
                    await message.delete();
                    deleteCount++;
                    // Small delay to avoid rate limits
                    await new Promise(resolve => setTimeout(resolve, 50));
                } catch (error) {
                    // Ignore deletion errors (message might already be deleted)
                }
            }
        }
        
        if (deleteCount > 0) {
            console.log(`🧹 [BIND DEBUG] Force cleanup: Cleared ${deleteCount} messages`);
        }
    } catch (error) {
        console.error('Error in force cleanup:', error);
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
module.exports.forceCleanup = forceCleanup;
