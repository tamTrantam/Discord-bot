const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check bot latency'),

    async execute(interaction) {
        const sent = await interaction.reply({ 
            content: 'Pinging...', 
            fetchReply: true,
            flags: 64 // Ephemeral flag - only visible to the user
        });
        
        const ping = sent.createdTimestamp - interaction.createdTimestamp;
        const apiPing = Math.round(interaction.client.ws.ping);

        await interaction.editReply({
            content: `🏓 Pong!\n📡 Latency: **${ping}ms**\n💗 API Ping: **${apiPing}ms**`
        });
    },
};
