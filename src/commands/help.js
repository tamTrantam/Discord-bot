const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show all available commands'),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('🎵 Discord YouTube Bot - Commands')
            .setDescription('Here are all the available commands for the music bot:')
            .addFields(
                {
                    name: '🎵 Music Commands',
                    value: [
                        '`/play <song/url>` - Play a song or add to queue',
                        '`/queue` - Show current queue',
                        '`/skip` - Skip current song',
                        '`/stop` - Stop playback and clear queue',
                        '`/pause` - Pause current song',
                        '`/resume` - Resume paused song',
                        '`/nowplaying` - Show currently playing song'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '🎛️ Queue Management',
                    value: [
                        '`/volume <1-100>` - Set playback volume',
                        '`/loop` - Toggle loop mode',
                        '`/shuffle` - Shuffle the queue',
                        '`/clear` - Clear the queue',
                        '`/remove <position>` - Remove song from queue'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '🔧 Utility Commands',
                    value: [
                        '`/help` - Show this help message',
                        '`/ping` - Check bot latency'
                    ].join('\n'),
                    inline: false
                }
            )
            .addFields(
                {
                    name: '📋 Features',
                    value: [
                        '✅ YouTube URL and search support',
                        '✅ Playlist support (up to 50 songs)',
                        '✅ Queue management',
                        '✅ Loop and shuffle modes',
                        '✅ Auto-disconnect when alone',
                        '✅ Volume control',
                        '✅ Rich embeds with song info'
                    ].join('\n'),
                    inline: false
                }
            )
            .setFooter({ 
                text: 'Join a voice channel and use /play to get started!',
                iconURL: interaction.client.user.displayAvatarURL()
            })
            .setTimestamp();

        await interaction.reply({ 
            embeds: [embed],
            ephemeral: true // Only visible to the user
        });
    },
};
