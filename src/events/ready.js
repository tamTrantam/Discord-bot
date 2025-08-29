module.exports = {
    name: 'clientReady',
    once: true,
    async execute(client) {
        console.log(`🚀 Bot is ready! Logged in as ${client.user.tag}`);
        console.log(`📊 Serving ${client.guilds.cache.size} servers`);
        
        // Set bot activity
        client.user.setActivity('🎵 YouTube Music', { type: 'LISTENING' });
        
        // Register slash commands
        try {
            console.log('🔄 Started refreshing application (/) commands.');
            
            const commands = [];
            client.commands.forEach(command => {
                commands.push(command.data.toJSON());
            });
            
            // Register commands globally (can take up to 1 hour to appear)
            await client.application.commands.set(commands);
            
            console.log('✅ Successfully reloaded application (/) commands.');
        } catch (error) {
            console.error('❌ Error registering slash commands:', error);
        }
    },
};
