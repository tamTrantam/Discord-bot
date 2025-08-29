const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pause the current song'),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const musicQueue = interaction.client.musicQueues.get(guildId);

        if (!musicQueue || !musicQueue.playing) {
            return interaction.reply({
                content: '❌ Nothing is currently playing!',
                ephemeral: true
            });
        }

        // Check if user is in the same voice channel
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel || voiceChannel.id !== musicQueue.connection?.joinConfig?.channelId) {
            return interaction.reply({
                content: '❌ You need to be in the same voice channel to pause the music!',
                ephemeral: true
            });
        }

        const success = musicQueue.pause();
        
        if (success) {
            await interaction.reply({
                content: '⏸️ Music paused!'
            });
        } else {
            await interaction.reply({
                content: '❌ Failed to pause the music!',
                ephemeral: true
            });
        }
    },
};
