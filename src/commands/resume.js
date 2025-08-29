const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Resume the paused song'),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const musicQueue = interaction.client.musicQueues.get(guildId);

        if (!musicQueue || musicQueue.playing) {
            return interaction.reply({
                content: '❌ Nothing is paused!',
                ephemeral: true
            });
        }

        // Check if user is in the same voice channel
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel || voiceChannel.id !== musicQueue.connection?.joinConfig?.channelId) {
            return interaction.reply({
                content: '❌ You need to be in the same voice channel to resume the music!',
                ephemeral: true
            });
        }

        const success = musicQueue.resume();
        
        if (success) {
            await interaction.reply({
                content: '▶️ Music resumed!'
            });
        } else {
            await interaction.reply({
                content: '❌ Failed to resume the music!',
                ephemeral: true
            });
        }
    },
};
