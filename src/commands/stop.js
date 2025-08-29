const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stop the music and clear the queue'),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const musicQueue = interaction.client.musicQueues.get(guildId);

        if (!musicQueue) {
            return interaction.reply({
                content: '❌ Nothing is currently playing!',
                ephemeral: true
            });
        }

        // Check if user is in the same voice channel
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel || voiceChannel.id !== musicQueue.connection?.joinConfig?.channelId) {
            return interaction.reply({
                content: '❌ You need to be in the same voice channel to stop the music!',
                ephemeral: true
            });
        }

        musicQueue.stop();
        musicQueue.disconnect();
        interaction.client.musicQueues.delete(guildId);

        await interaction.reply({
            content: '⏹️ Music stopped and queue cleared!'
        });
    },
};
