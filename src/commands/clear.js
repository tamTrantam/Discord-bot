const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Clear the queue (keeps current song playing)'),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const musicQueue = interaction.client.musicQueues.get(guildId);

        if (!musicQueue || musicQueue.songs.length === 0) {
            return interaction.reply({
                content: '❌ The queue is already empty!',
                ephemeral: true
            });
        }

        // Check if user is in the same voice channel
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel || voiceChannel.id !== musicQueue.connection?.joinConfig?.channelId) {
            return interaction.reply({
                content: '❌ You need to be in the same voice channel to clear the queue!',
                ephemeral: true
            });
        }

        const queueLength = musicQueue.songs.length - 1; // Exclude currently playing song
        musicQueue.clear();

        await interaction.reply({
            content: `🗑️ Cleared **${queueLength}** songs from the queue!`
        });
    },
};
