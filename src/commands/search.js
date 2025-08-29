const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

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
                ephemeral: true
            });
        }
    },

    async searchMusic(query) {
        console.log(`🔍 [SEARCH] Starting search for: "${query}"`);
        
        try {
            // Try different yt-dlp paths for different deployment environments
            const ytdlpPaths = [
                'yt-dlp',                    // Standard PATH
                '/usr/local/bin/yt-dlp',     // Common install location
                '/opt/render/project/.local/bin/yt-dlp', // User local install
                'python3 -m yt_dlp'         // Python module fallback
            ];
            
            let command = null;
            for (const ytdlpPath of ytdlpPaths) {
                try {
                    const testCommand = `${ytdlpPath} --version`;
                    await execPromise(testCommand, { timeout: 5000 });
                    command = `${ytdlpPath} "ytsearch10:${query}" --get-title --get-url --get-duration --no-playlist --flat-playlist`;
                    console.log(`🔍 [SEARCH] Using yt-dlp path: ${ytdlpPath}`);
                    break;
                } catch (testError) {
                    console.log(`🔍 [SEARCH] ${ytdlpPath} not available`);
                    continue;
                }
            }
            
            if (!command) {
                throw new Error('yt-dlp not found in any expected location');
            }
            
            console.log(`🔍 [SEARCH] Running command: ${command}`);
            
            const { stdout, stderr } = await execPromise(command, { 
                timeout: 20000,
                maxBuffer: 1024 * 1024 * 2 // 2MB buffer
            });
            
            if (stderr && !stderr.includes('WARNING')) {
                console.log('🔍 [SEARCH] stderr:', stderr);
            }

            if (!stdout || stdout.trim() === '') {
                console.log('🔍 [SEARCH] No results found');
                return [];
            }

            const lines = stdout.trim().split('\n').filter(line => line.trim() !== '');
            const results = [];

            // Process results in groups of 3 (title, url, duration)
            for (let i = 0; i < lines.length; i += 3) {
                if (i + 2 < lines.length) {
                    const title = lines[i].trim();
                    const url = lines[i + 1].trim();
                    const duration = lines[i + 2].trim();
                    
                    if (title && url && url.startsWith('https://')) {
                        results.push({
                            title: title.length > 60 ? title.substring(0, 57) + '...' : title,
                            url,
                            duration: duration || 'Unknown'
                        });
                    }
                }
            }

            console.log(`🔍 [SEARCH] Found ${results.length} results`);
            return results.slice(0, 15); // Limit to 15 results max (5 pages)
            
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
        const parts = customId.split('_');
        const sessionId = parts.slice(1, -1).join('_');
        const resultIndex = parseInt(parts[parts.length - 1]);
        
        const session = client.searchSessions?.get(sessionId);
        if (!session) {
            return interaction.reply({
                content: '❌ Search session expired. Please search again.',
                ephemeral: true
            });
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
            // IMMEDIATELY acknowledge the interaction to prevent timeout
            await interaction.update({
                content: '🎵 Adding song to queue...',
                embeds: [],
                components: []
            });

            const playCommand = client.commands.get('play');
            if (playCommand) {
                // Create a new interaction wrapper for followUp instead of editReply
                const playInteraction = Object.create(interaction);
                playInteraction.options = {
                    getString: () => selectedResult.url
                };
                
                // Override the reply methods to use followUp
                playInteraction.deferReply = async () => {
                    // Already handled by search interface
                    return;
                };
                playInteraction.editReply = async (options) => {
                    // Convert editReply to followUp for new message
                    return await interaction.followUp(options);
                };
                playInteraction.replied = false;
                playInteraction.deferred = false;
                
                await playCommand.execute(playInteraction);
                
                // Clean up the search interface
                try {
                    // First try to delete the interaction reply completely
                    await interaction.deleteReply();
                    console.log('🧹 [SEARCH DEBUG] Completely deleted public search interface');
                } catch (deleteError) {
                    console.log('🧹 [SEARCH DEBUG] Could not delete public message:', deleteError.message);
                    // Fallback: Edit to a minimal message and schedule deletion
                    try {
                        await interaction.editReply({
                            content: `✅ **${selectedResult.title}** added to queue`,
                            embeds: [],
                            components: []
                        });
                        
                        // Delete after 3 seconds
                        setTimeout(async () => {
                            try {
                                await interaction.deleteReply();
                                console.log('🧹 [SEARCH DEBUG] Delayed deletion successful');
                            } catch (delayedError) {
                                console.log('🧹 [SEARCH DEBUG] Delayed deletion failed:', delayedError.message);
                            }
                        }, 3000);
                    } catch (editError) {
                        console.log('🧹 [SEARCH DEBUG] Could not edit reply:', editError.message);
                    }
                }
                
                // Clear the session
                client.searchSessions?.delete(sessionId);
                console.log('🧹 [SEARCH DEBUG] Cleared search session');
                
                // Update control panel and force cleanup if bound
                const bindCommand = client.commands.get('bind');
                if (bindCommand && bindCommand.updateControlPanel) {
                    try {
                        await bindCommand.updateControlPanel(client, interaction.guild.id);
                        console.log('🧹 [SEARCH DEBUG] Updated control panel');
                        
                        // Force cleanup after a short delay
                        setTimeout(async () => {
                            if (bindCommand.forceCleanup) {
                                await bindCommand.forceCleanup(client, interaction.guild.id);
                            }
                        }, 1000);
                    } catch (updateError) {
                        console.log('🧹 [SEARCH DEBUG] Control panel update failed:', updateError.message);
                    }
                }
            } else {
                await interaction.followUp({
                    content: `✅ Selected: **${selectedResult.title}**\nUse the play command to add it to queue.`
                });
            }
        } catch (error) {
            console.log('Error in song selection:', error.message);
            
            // IMMEDIATELY acknowledge the interaction even on error
            try {
                await interaction.update({
                    content: `❌ Failed to add song to queue. Error: ${error.message}`,
                    embeds: [],
                    components: []
                });
                
                // Delete the error message after 5 seconds
                setTimeout(async () => {
                    try {
                        await interaction.deleteReply();
                        console.log('🧹 [SEARCH DEBUG] Deleted public search interface after error');
                    } catch (deleteError) {
                        console.log('🧹 [SEARCH DEBUG] Could not delete after error:', deleteError.message);
                    }
                }, 5000); // Show error for 5 seconds before deleting
                
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
            
            // Delete the search interface
            try {
                await interaction.update({
                    content: '❌ Search cancelled by user.',
                    embeds: [],
                    components: []
                });
                
                // Delete after 2 seconds
                setTimeout(async () => {
                    try {
                        await interaction.deleteReply();
                        console.log('🧹 [SEARCH DEBUG] Deleted cancelled search interface');
                        
                        // Force aggressive cleanup after cancellation
                        const bindCommand = client.commands.get('bind');
                        if (bindCommand) {
                            await bindCommand.forceCleanup(client, interaction.guild.id);
                        }
                    } catch (deleteError) {
                        console.log('🧹 [SEARCH DEBUG] Could not delete cancelled search:', deleteError.message);
                    }
                }, 2000);
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
