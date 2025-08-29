const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unbind')
        .setDescription('Remove the music control panel binding from this server'),
        // Removed permission requirement for testing

    async execute(interaction) {
        const guildId = interaction.guild.id;
        
        if (!interaction.client.musicBindings) {
            return interaction.reply({
                content: '❌ No music control panel is bound in this server!',
                ephemeral: true
            });
        }
        
        const binding = interaction.client.musicBindings.get(guildId);
        if (!binding) {
            return interaction.reply({
                content: '❌ No music control panel is bound in this server!',
                ephemeral: true
            });
        }

        try {
            // Remove the control panel message
            const channel = await interaction.client.channels.fetch(binding.channelId);
            if (binding.messageId) {
                const message = await channel.messages.fetch(binding.messageId);
                await message.delete();
            }
        } catch (error) {
            console.log('Could not remove control panel message:', error.message);
        }

        // Clear the update interval
        if (interaction.client.updateIntervals?.has(guildId)) {
            clearInterval(interaction.client.updateIntervals.get(guildId));
            interaction.client.updateIntervals.delete(guildId);
        }

        // Remove the binding
        interaction.client.musicBindings.delete(guildId);

        await interaction.reply({
            content: '✅ Music control panel has been unbound from this server!',
            ephemeral: true
        });
    }
};
