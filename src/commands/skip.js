const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skip the current song'),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const musicQueue = interaction.client.musicQueues.get(guildId);

        if (!musicQueue || !musicQueue.currentSong) {
            return interaction.reply({
                content: '❌ Nothing is currently playing!',
                ephemeral: true
            });
        }

        // Check if user is in the same voice channel
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel || voiceChannel.id !== musicQueue.connection?.joinConfig?.channelId) {
            return interaction.reply({
                content: '❌ You need to be in the same voice channel to skip songs!',
                ephemeral: true
            });
        }

        const skippedSong = musicQueue.currentSong;
        musicQueue.skip();

        await interaction.reply({
            content: `⏭️ Skipped: **${skippedSong.title}**`
        });
    },
};
