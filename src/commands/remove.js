const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Remove a song from the queue')
        .addIntegerOption(option =>
            option.setName('position')
                .setDescription('Position of the song to remove (1-based)')
                .setRequired(true)
                .setMinValue(1)),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const musicQueue = interaction.client.musicQueues.get(guildId);

        if (!musicQueue || musicQueue.songs.length === 0) {
            return interaction.reply({
                content: '❌ The queue is empty!',
                ephemeral: true
            });
        }

        // Check if user is in the same voice channel
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel || voiceChannel.id !== musicQueue.connection?.joinConfig?.channelId) {
            return interaction.reply({
                content: '❌ You need to be in the same voice channel to remove songs!',
                ephemeral: true
            });
        }

        const position = interaction.options.getInteger('position');
        
        // Check if position is valid (can't remove currently playing song)
        if (position === 1) {
            return interaction.reply({
                content: '❌ Cannot remove the currently playing song! Use `/skip` instead.',
                ephemeral: true
            });
        }

        if (position > musicQueue.songs.length) {
            return interaction.reply({
                content: `❌ Invalid position! Queue only has ${musicQueue.songs.length} songs.`,
                ephemeral: true
            });
        }

        const removedSong = musicQueue.removeSong(position - 1); // Convert to 0-based index

        if (removedSong) {
            await interaction.reply({
                content: `🗑️ Removed **${removedSong.title}** from position ${position}`
            });
        } else {
            await interaction.reply({
                content: '❌ Failed to remove song from queue!',
                ephemeral: true
            });
        }
    },
};
