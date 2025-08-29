const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } = require('discord.js');
const YouTube = require('youtube-sr').default;
const ytdl = require('ytdl-core');

// Search sessions to track user interactions
const searchSessions = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('search')
        .setDescription('Search for music and select what to play'),

    async execute(interaction) {
        const modal = new ModalBuilder()
            .setCustomId('search_modal')
            .setTitle('Search for Music');

        const searchInput = new TextInputBuilder()
            .setCustomId('search_query')
            .setLabel('What would you like to search for?')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter song name, artist, or YouTube URL...')
            .setRequired(true)
            .setMaxLength(100);

        const firstActionRow = new ActionRowBuilder().addComponents(searchInput);
        modal.addComponents(firstActionRow);

        try {
            await interaction.showModal(modal);
        } catch (error) {
            console.log('Error showing search modal:', error.message);
            await interaction.reply({
                content: '❌ Failed to show search interface.',
                flags: MessageFlags.Ephemeral
            });
        }
    },

    async searchMusic(query) {
        console.log(`🔍 [SEARCH] Starting search for: "${query}"`);
        
        try {
            // Use youtube-sr for pure Node.js YouTube search
            console.log(`🔍 [SEARCH] Using youtube-sr Node.js package`);
            
            const searchResults = await YouTube.search(query, { 
                limit: 10, 
                type: 'video',
                safeSearch: false
            });
            
            if (!searchResults || searchResults.length === 0) {
                console.log('🔍 [SEARCH] No results found');
                return [];
            }
            
            console.log(`🔍 [SEARCH] ✅ Found ${searchResults.length} results`);
            
            const results = searchResults.map(video => ({
                title: video.title || 'Unknown Title',
                url: video.url || `https://youtube.com/watch?v=${video.id}`,
                duration: video.durationFormatted || 'Unknown Duration',
                thumbnail: video.thumbnail?.url || 'https://via.placeholder.com/120x90?text=No+Image'
            }));

            return results;
            
        } catch (error) {
            console.log('🔍 [SEARCH] Error during search:', error.message);
            return [];
        }
    },

    // Optimized embed creation with pre-built field arrays
    async createSearchEmbed(results, query, currentPage, totalResults) {
        const startIndex = currentPage * 3;
        const pageResults = results.slice(startIndex, startIndex + 3);
        
        // Pre-build fields array for better performance
        const fields = pageResults.map((result, index) => ({
            name: `${startIndex + index + 1}. ${result.title}`,
            value: `Duration: ${result.duration}`,
            inline: false
        }));

        const totalPages = Math.ceil(totalResults / 3);
        
        return new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle(`🔍 Search Results for: "${query}"`)
            .addFields(fields)
            .setFooter({ 
                text: `Page ${currentPage + 1} of ${totalPages} • ${totalResults} total results • Select a song below` 
            })
            .setTimestamp();
    },

    // Optimized button creation with pre-created components
    createSearchButtons(pageResults, sessionId, currentPage, totalResults) {
        const startIndex = currentPage * 3;
        const totalPages = Math.ceil(totalResults / 3);
        
        // Pre-create song selection buttons
        const songButtons = pageResults.map((_, index) => 
            new ButtonBuilder()
                .setCustomId(`search_${sessionId}_${startIndex + index}`)
                .setLabel(`${startIndex + index + 1}`)
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🎵')
        );

        // Pre-create navigation buttons
        const prevButton = new ButtonBuilder()
            .setCustomId(`search_prev_${sessionId}`)
            .setLabel('Previous')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('⬅️')
            .setDisabled(currentPage === 0);

        const nextButton = new ButtonBuilder()
            .setCustomId(`search_next_${sessionId}`)
            .setLabel('Next')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('➡️')
            .setDisabled(currentPage >= totalPages - 1);

        const cancelButton = new ButtonBuilder()
            .setCustomId(`search_cancel_${sessionId}`)
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('❌');

        // Combine buttons efficiently with Discord's 5-button limit per row
        const rows = [];
        
        // First row: Song selection buttons (up to 3)
        if (songButtons.length > 0) {
            const songRow = new ActionRowBuilder().addComponents(songButtons);
            rows.push(songRow);
        }
        
        // Second row: Navigation and cancel buttons
        const controlButtons = [];
        if (totalPages > 1) {
            controlButtons.push(prevButton, nextButton);
        }
        controlButtons.push(cancelButton);
        
        if (controlButtons.length > 0) {
            const controlRow = new ActionRowBuilder().addComponents(controlButtons);
            rows.push(controlRow);
        }

        return rows;
    },

    async handleSearchInteraction(interaction, client, customId) {
        // Fast routing based on custom ID for better performance
        if (customId.startsWith('search_cancel_')) {
            return this.handleCancel(interaction, client, customId);
        } else if (customId.includes('search_prev_') || customId.includes('search_next_')) {
            return this.handlePagination(interaction, client, customId);
        } else {
            return this.handleSelection(interaction, client, customId);
        }
    },

    async handleSelection(interaction, client, customId) {
        console.log(`🔍 [SEARCH DEBUG] Button clicked: ${customId}`);
        const parts = customId.split('_');
        const sessionId = parts.slice(1, -1).join('_');
        const resultIndex = parseInt(parts[parts.length - 1]);
        
        console.log(`🔍 [SEARCH DEBUG] Parsed sessionId: ${sessionId}, resultIndex: ${resultIndex}`);
        console.log(`🔍 [SEARCH DEBUG] Available sessions: ${client.searchSessions ? client.searchSessions.size : 0}`);
        
        const session = client.searchSessions?.get(sessionId);
        if (!session) {
            console.log(`🔍 [SEARCH DEBUG] Session not found! Available: ${Array.from(client.searchSessions?.keys() || []).join(', ')}`);
            try {
                return await interaction.reply({
                    content: '❌ Search session expired. Please search again.',
                    flags: MessageFlags.Ephemeral
                });
            } catch (error) {
                console.log('🧹 [SEARCH DEBUG] Could not reply about expired session:', error.message);
                return;
            }
        }

        if (session.userId !== interaction.user.id) {
            return interaction.reply({
                content: '❌ This is not your search session!',
                ephemeral: true
            });
        }

        const selectedResult = session.results[resultIndex];
        if (!selectedResult) {
            return interaction.reply({
                content: '❌ Invalid selection!',
                ephemeral: true
            });
        }

        // Add to queue using the play command logic
        try {
            // IMMEDIATELY defer the interaction to prevent timeout
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const playCommand = client.commands.get('play');
            if (playCommand) {
                // Create a new interaction wrapper for the play command
                const playInteraction = Object.create(interaction);
                playInteraction.options = {
                    getString: () => selectedResult.url
                };
                
                // Override reply methods to prevent conflicts
                playInteraction.deferReply = async () => Promise.resolve();
                playInteraction.editReply = async (options) => {
                    // Use followUp for play command responses
                    return await interaction.followUp({ ...options, ephemeral: false });
                };
                playInteraction.replied = false;
                playInteraction.deferred = false;
                
                await playCommand.execute(playInteraction);
                
                // Clean up the search interface AFTER successful play
                try {
                    // Edit to show success message and keep it longer
                    await interaction.editReply({
                        content: `✅ **${selectedResult.title}** added to queue!`,
                        embeds: [],
                        components: []
                    });
                    
                    // Delete after 10 seconds (longer visibility)
                    setTimeout(async () => {
                        try {
                            await interaction.deleteReply();
                            console.log('🧹 [SEARCH DEBUG] Deleted search interface after success');
                        } catch (delayedError) {
                            console.log('🧹 [SEARCH DEBUG] Could not delete after delay:', delayedError.message);
                        }
                    }, 10000);
                    
                } catch (editError) {
                    console.log('🧹 [SEARCH DEBUG] Could not edit reply after success:', editError.message);
                }
                
                // Update control panel BEFORE clearing session (to avoid conflicts)
                const bindCommand = client.commands.get('bind');
                if (bindCommand && bindCommand.updateControlPanel) {
                    try {
                        setTimeout(async () => {
                            await bindCommand.updateControlPanel(client, interaction.guild.id);
                            console.log('🧹 [SEARCH DEBUG] Updated control panel');
                        }, 2000); // Delay to avoid conflicts
                    } catch (updateError) {
                        console.log('🧹 [SEARCH DEBUG] Control panel update failed:', updateError.message);
                    }
                }
                
                // Clear the session AFTER control panel update is scheduled
                setTimeout(() => {
                    client.searchSessions?.delete(sessionId);
                    console.log('🧹 [SEARCH DEBUG] Cleared search session (delayed)');
                }, 3000); // Delay to ensure all operations complete
            } else {
                await interaction.editReply({
                    content: `✅ Selected: **${selectedResult.title}**\nPlay command not available.`
                });
            }
        } catch (error) {
            console.log('Error in song selection:', error.message);
            
            // Handle errors without multiple acknowledgments
            try {
                await interaction.editReply({
                    content: `❌ Failed to add song: ${error.message.includes('410') ? 'Video unavailable on YouTube' : error.message}`,
                    embeds: [],
                    components: []
                });
                
                // Keep error visible longer
                setTimeout(async () => {
                    try {
                        await interaction.deleteReply();
                        console.log('🧹 [SEARCH DEBUG] Deleted search interface after error');
                    } catch (deleteError) {
                        console.log('🧹 [SEARCH DEBUG] Could not delete after error:', deleteError.message);
                    }
                }, 8000); // 8 seconds for error visibility
                
            } catch (updateError) {
                console.log('🧹 [SEARCH DEBUG] Could not update interaction on error:', updateError.message);
            }
        }
    },

    async handleCancel(interaction, client, customId) {
        const sessionId = customId.replace('search_cancel_', '');
        const session = client.searchSessions?.get(sessionId);
        
        if (session && session.userId === interaction.user.id) {
            // Clean up session
            client.searchSessions?.delete(sessionId);
            
            // Update instead of trying to delete immediately
            try {
                await interaction.update({
                    content: '❌ Search cancelled.',
                    embeds: [],
                    components: []
                });
                
                // Delete after 5 seconds (less aggressive)
                setTimeout(async () => {
                    try {
                        await interaction.deleteReply();
                        console.log('🧹 [SEARCH DEBUG] Deleted cancelled search interface');
                    } catch (deleteError) {
                        console.log('🧹 [SEARCH DEBUG] Could not delete cancelled search:', deleteError.message);
                    }
                }, 5000);
            } catch (error) {
                console.log('🧹 [SEARCH DEBUG] Could not cancel search:', error.message);
            }
        } else {
            try {
                await interaction.reply({
                    content: '❌ This is not your search session!',
                    ephemeral: true
                });
            } catch (error) {
                console.log('🧹 [SEARCH DEBUG] Could not reply to unauthorized cancel:', error.message);
            }
        }
    },

    async handlePagination(interaction, client, customId) {
        const direction = customId.includes('_prev_') ? 'prev' : 'next';
        const sessionId = customId.replace(`search_${direction}_`, '');
        const session = client.searchSessions?.get(sessionId);
        
        if (!session) {
            try {
                await interaction.reply({
                    content: '❌ Search session expired!',
                    ephemeral: true
                });
            } catch (error) {
                console.log('🧹 [SEARCH DEBUG] Could not reply about expired session:', error.message);
            }
            return;
        }

        if (session.userId !== interaction.user.id) {
            try {
                await interaction.reply({
                    content: '❌ This is not your search session!',
                    ephemeral: true
                });
            } catch (error) {
                console.log('🧹 [SEARCH DEBUG] Could not reply to unauthorized pagination:', error.message);
            }
            return;
        }

        if (direction === 'next') {
            session.currentPage++;
        } else {
            session.currentPage--;
        }

        const startIndex = session.currentPage * 3;
        const endIndex = startIndex + 3;
        const pageResults = session.results.slice(startIndex, endIndex);

        if (pageResults.length === 0) {
            session.currentPage -= direction === 'next' ? 1 : -1; // revert the page change
            try {
                await interaction.reply({
                    content: '❌ No more results!',
                    ephemeral: true
                });
            } catch (error) {
                console.log('🧹 [SEARCH DEBUG] Could not reply about no more results:', error.message);
            }
            return;
        }

        const embed = await this.createSearchEmbed(session.results, session.query, session.currentPage, session.results.length);
        const buttonRows = this.createSearchButtons(pageResults, sessionId, session.currentPage, session.results.length);

        try {
            await interaction.update({
                embeds: [embed],
                components: buttonRows
            });
        } catch (error) {
            console.log('🧹 [SEARCH DEBUG] Error updating pagination:', error.message);
        }
    },

    // Optimized session cleanup with batch processing
    async cleanupOldSessions(client) {
        const currentTime = Date.now();
        const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes
        let cleanedCount = 0;
        
        // Batch cleanup for better performance
        const expiredSessions = [];
        for (const [sessionId, session] of client.searchSessions || []) {
            if (currentTime - session.timestamp > SESSION_TIMEOUT) {
                expiredSessions.push(sessionId);
            }
        }
        
        // Remove expired sessions
        for (const sessionId of expiredSessions) {
            client.searchSessions?.delete(sessionId);
            cleanedCount++;
        }
        
        if (cleanedCount > 0) {
            console.log(`🧹 [SEARCH] Cleaned up ${cleanedCount} expired search sessions`);
        }
    }
};
