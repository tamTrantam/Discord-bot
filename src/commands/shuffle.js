const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shuffle')
        .setDescription('Shuffle the current queue'),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const musicQueue = interaction.client.musicQueues.get(guildId);

        if (!musicQueue || musicQueue.songs.length <= 1) {
            return interaction.reply({
                content: '❌ Need at least 2 songs in queue to shuffle!',
                ephemeral: true
            });
        }

        // Check if user is in the same voice channel
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel || voiceChannel.id !== musicQueue.connection?.joinConfig?.channelId) {
            return interaction.reply({
                content: '❌ You need to be in the same voice channel to shuffle the queue!',
                ephemeral: true
            });
        }

        musicQueue.shuffle();

        await interaction.reply({
            content: '🔀 Queue shuffled!'
        });
    },
};
