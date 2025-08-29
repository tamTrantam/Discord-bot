const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const YouTubeUtils = require('../utils/YouTubeUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Show the current music queue'),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const musicQueue = interaction.client.musicQueues.get(guildId);

        if (!musicQueue || musicQueue.songs.length === 0) {
            return interaction.reply({
                content: '📭 The queue is currently empty!',
                ephemeral: true
            });
        }

        const queueInfo = musicQueue.getQueue();
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🎵 Music Queue')
            .setTimestamp();

        // Current song
        if (queueInfo.current) {
            embed.addFields({
                name: '🎶 Now Playing',
                value: `**[${queueInfo.current.title}](${queueInfo.current.url})**\n` +
                       `⏱️ ${YouTubeUtils.formatDuration(queueInfo.current.duration)} | ` +
                       `👤 ${queueInfo.current.requestedBy?.displayName || 'Unknown'}`,
                inline: false
            });
        }

        // Queue
        if (queueInfo.queue.length > 0) {
            const queueList = queueInfo.queue.slice(0, 10).map((song, index) => {
                return `**${index + 1}.** [${song.title}](${song.url})\n` +
                       `⏱️ ${YouTubeUtils.formatDuration(song.duration)} | ` +
                       `👤 ${song.requestedBy?.displayName || 'Unknown'}`;
            }).join('\n\n');

            embed.addFields({
                name: `📋 Up Next (${queueInfo.queue.length} songs)`,
                value: queueList,
                inline: false
            });

            if (queueInfo.queue.length > 10) {
                embed.setFooter({ 
                    text: `And ${queueInfo.queue.length - 10} more songs...` 
                });
            }
        }

        // Queue stats
        const totalDuration = queueInfo.queue.reduce((total, song) => total + (song.duration || 0), 0);
        const statsValue = [
            `🔁 Loop: ${queueInfo.loop ? 'On' : 'Off'}`,
            `🔊 Volume: ${queueInfo.volume}%`,
            `⏰ Total Duration: ${YouTubeUtils.formatDuration(totalDuration)}`
        ].join(' | ');

        embed.addFields({
            name: '📊 Queue Stats',
            value: statsValue,
            inline: false
        });

        // Create interactive buttons
        const playbackRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('queue_refresh')
                    .setLabel('🔄 Refresh')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('shuffle_queue')
                    .setLabel('🔀 Shuffle')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(queueInfo.queue.length < 2),
                new ButtonBuilder()
                    .setCustomId('toggle_loop')
                    .setLabel(`🔁 Loop: ${queueInfo.loop ? 'ON' : 'OFF'}`)
                    .setStyle(queueInfo.loop ? ButtonStyle.Success : ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('clear_queue')
                    .setLabel('🗑️ Clear')
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(queueInfo.queue.length === 0)
            );

        const controlRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('toggle_playback')
                    .setLabel(musicQueue.isPlaying ? '⏸️ Pause' : '▶️ Resume')
                    .setStyle(musicQueue.isPlaying ? ButtonStyle.Secondary : ButtonStyle.Success)
                    .setDisabled(!queueInfo.current),
                new ButtonBuilder()
                    .setCustomId('skip_song')
                    .setLabel('⏭️ Skip')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(queueInfo.queue.length === 0),
                new ButtonBuilder()
                    .setCustomId('stop_music')
                    .setLabel('⏹️ Stop')
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(!queueInfo.current),
                new ButtonBuilder()
                    .setCustomId('volume_menu')
                    .setLabel('🔊 Volume')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({ 
            embeds: [embed], 
            components: [playbackRow, controlRow] 
        });
    },
};
