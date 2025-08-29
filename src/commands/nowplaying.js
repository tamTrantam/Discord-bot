const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const YouTubeUtils = require('../utils/YouTubeUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Show the currently playing song'),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const musicQueue = interaction.client.musicQueues.get(guildId);

        if (!musicQueue || !musicQueue.currentSong) {
            return interaction.reply({
                content: '❌ Nothing is currently playing!',
                ephemeral: true
            });
        }

        const song = musicQueue.currentSong;
        const queueInfo = musicQueue.getQueue();

        const embed = new EmbedBuilder()
            .setColor('#ff6b6b')
            .setTitle('🎶 Now Playing')
            .setDescription(`**[${song.title}](${song.url})**`)
            .addFields(
                { name: '⏱️ Duration', value: YouTubeUtils.formatDuration(song.duration), inline: true },
                { name: '👤 Requested by', value: song.requestedBy?.displayName || 'Unknown', inline: true },
                { name: '🔊 Volume', value: `${queueInfo.volume}%`, inline: true },
                { name: '🔁 Loop', value: queueInfo.loop ? 'On' : 'Off', inline: true },
                { name: '📋 Queue Length', value: `${queueInfo.queue.length} songs`, inline: true },
                { name: '▶️ Status', value: queueInfo.playing ? 'Playing' : 'Paused', inline: true }
            )
            .setThumbnail(song.thumbnail)
            .setTimestamp();

        if (song.author) {
            embed.addFields({ name: '🎤 Artist', value: song.author, inline: true });
        }

        // Create interactive control buttons
        const mainControlRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('toggle_playback')
                    .setLabel(queueInfo.playing ? '⏸️ Pause' : '▶️ Resume')
                    .setStyle(queueInfo.playing ? ButtonStyle.Secondary : ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('skip_song')
                    .setLabel('⏭️ Skip')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(queueInfo.queue.length === 0),
                new ButtonBuilder()
                    .setCustomId('stop_music')
                    .setLabel('⏹️ Stop')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('toggle_loop')
                    .setLabel(`🔁 ${queueInfo.loop ? 'Disable' : 'Enable'} Loop`)
                    .setStyle(queueInfo.loop ? ButtonStyle.Success : ButtonStyle.Secondary)
            );

        const additionalRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('volume_down')
                    .setLabel('🔉 -10')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(queueInfo.volume <= 10),
                new ButtonBuilder()
                    .setCustomId('volume_up')
                    .setLabel('🔊 +10')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(queueInfo.volume >= 100),
                new ButtonBuilder()
                    .setCustomId('shuffle_queue')
                    .setLabel('🔀 Shuffle')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(queueInfo.queue.length < 2),
                new ButtonBuilder()
                    .setLabel('🎵 Open in YouTube')
                    .setStyle(ButtonStyle.Link)
                    .setURL(song.url)
            );

        await interaction.reply({ 
            embeds: [embed], 
            components: [mainControlRow, additionalRow] 
        });
    },
};
