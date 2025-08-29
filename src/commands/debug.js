const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const os = require('os');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('debug')
        .setDescription('Show debug information and bot status')
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Show bot status and system information'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle')
                .setDescription('Toggle debug mode (Admin only)'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('queue')
                .setDescription('Show detailed queue debug information')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'status') {
            await this.showStatus(interaction);
        } else if (subcommand === 'toggle') {
            await this.toggleDebug(interaction);
        } else if (subcommand === 'queue') {
            await this.showQueueDebug(interaction);
        }
    },

    async showStatus(interaction) {
        const uptime = process.uptime();
        const memoryUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('🐛 Bot Debug Information')
            .addFields(
                {
                    name: '🤖 Bot Status',
                    value: [
                        `**Uptime:** ${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`,
                        `**Guilds:** ${interaction.client.guilds.cache.size}`,
                        `**Users:** ${interaction.client.users.cache.size}`,
                        `**Commands:** ${interaction.client.commands.size}`,
                        `**Debug Mode:** ${process.env.DEBUG_MODE === 'true' ? '✅ Enabled' : '❌ Disabled'}`
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '💾 Memory Usage',
                    value: [
                        `**RSS:** ${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
                        `**Heap Used:** ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
                        `**Heap Total:** ${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
                        `**External:** ${Math.round(memoryUsage.external / 1024 / 1024)}MB`
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '🖥️ System Info',
                    value: [
                        `**Platform:** ${os.platform()} ${os.arch()}`,
                        `**Node.js:** ${process.version}`,
                        `**Discord.js:** ${require('discord.js').version}`,
                        `**CPU Load:** ${os.loadavg()[0].toFixed(2)}`
                    ].join('\n'),
                    inline: true
                }
            );

        // Add music queue information
        const musicQueues = interaction.client.musicQueues;
        if (musicQueues.size > 0) {
            const queueInfo = [];
            musicQueues.forEach((queue, guildId) => {
                const guild = interaction.client.guilds.cache.get(guildId);
                queueInfo.push(`**${guild?.name || guildId}:** ${queue.songs.length} songs`);
            });

            embed.addFields({
                name: '🎵 Active Music Queues',
                value: queueInfo.slice(0, 10).join('\n') || 'No active queues',
                inline: false
            });
        }

        embed.setTimestamp();
        await interaction.reply({ 
            embeds: [embed],
            flags: 64 // Ephemeral flag - only visible to the user
        });
    },

    async toggleDebug(interaction) {
        // Check if user has administrator permissions
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({
                content: '❌ You need Administrator permissions to toggle debug mode!',
                ephemeral: true
            });
        }

        const currentDebugMode = process.env.DEBUG_MODE === 'true';
        process.env.DEBUG_MODE = currentDebugMode ? 'false' : 'true';

        await interaction.reply({
            content: `🐛 Debug mode is now **${process.env.DEBUG_MODE === 'true' ? 'enabled' : 'disabled'}**!`,
            ephemeral: true
        });
    },

    async showQueueDebug(interaction) {
        const guildId = interaction.guild.id;
        const musicQueue = interaction.client.musicQueues.get(guildId);

        if (!musicQueue) {
            return interaction.reply({
                content: '❌ No music queue found for this server!',
                ephemeral: true
            });
        }

        const queueInfo = musicQueue.getQueue();
        
        const embed = new EmbedBuilder()
            .setColor('#ff9900')
            .setTitle('🐛 Queue Debug Information')
            .addFields(
                {
                    name: '📊 Queue Stats',
                    value: [
                        `**Guild ID:** ${guildId}`,
                        `**Songs in Queue:** ${musicQueue.songs.length}`,
                        `**Currently Playing:** ${queueInfo.current ? '✅' : '❌'}`,
                        `**Player Status:** ${queueInfo.playing ? 'Playing' : 'Idle'}`,
                        `**Loop Mode:** ${queueInfo.loop ? 'On' : 'Off'}`,
                        `**Volume:** ${queueInfo.volume}%`
                    ].join('\n'),
                    inline: true
                }
            );

        if (queueInfo.current) {
            embed.addFields({
                name: '🎵 Current Song Debug',
                value: [
                    `**Title:** ${queueInfo.current.title}`,
                    `**URL:** ${queueInfo.current.url.slice(0, 50)}...`,
                    `**Duration:** ${queueInfo.current.duration}s`,
                    `**Requested By:** ${queueInfo.current.requestedBy?.tag || 'Unknown'}`
                ].join('\n'),
                inline: false
            });
        }

        if (musicQueue.connection) {
            embed.addFields({
                name: '🔌 Connection Debug',
                value: [
                    `**State:** ${musicQueue.connection.state.status}`,
                    `**Channel ID:** ${musicQueue.connection.joinConfig.channelId}`,
                    `**Adapter Created:** ${!!musicQueue.connection.joinConfig.adapterCreator}`
                ].join('\n'),
                inline: true
            });
        }

        embed.setTimestamp();
        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
