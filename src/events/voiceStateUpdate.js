const { VoiceConnectionStatus } = require('@discordjs/voice'); // For connection status checks

module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState) {
        const client = newState.client;
        const guildId = newState.guild.id;
        const musicQueue = client.musicQueues.get(guildId);
        
        // If bot is not in a voice channel or no music queue exists, return
        if (!musicQueue || !musicQueue.connection) return;
        
        // Get the voice channel the bot is in
        const botChannel = oldState.guild.members.cache.get(client.user.id)?.voice?.channel;
        if (!botChannel) return;
        
        // Check if anyone else is in the voice channel
        const membersInChannel = botChannel.members.filter(member => !member.user.bot);
        
        // If no one else is in the channel, disconnect after a delay
        if (membersInChannel.size === 0) {
            console.log(`👥 No users in voice channel, disconnecting in 30 seconds...`);
            
            setTimeout(() => {
                // Double check that no one joined during the delay
                const currentMembersInChannel = botChannel.members.filter(member => !member.user.bot);
                if (currentMembersInChannel.size === 0) {
                    console.log(`🔌 Auto-disconnecting from empty voice channel`);
                    musicQueue.destroy();
                    client.musicQueues.delete(guildId);
                }
            }, 30000); // 30 seconds delay
        }
    },
};
