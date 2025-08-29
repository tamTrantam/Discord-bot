// Example: Advanced Button Implementation Examples
// This file shows advanced patterns you can implement

const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

// 1. CONFIRMATION DIALOG PATTERN
async function createConfirmationDialog(interaction, action, description) {
    const confirmButton = new ButtonBuilder()
        .setCustomId(`confirm_${action}`)
        .setLabel('✅ Confirm')
        .setStyle(ButtonStyle.Danger);

    const cancelButton = new ButtonBuilder()
        .setCustomId(`cancel_${action}`)
        .setLabel('❌ Cancel')
        .setStyle(ButtonStyle.Secondary);

    const confirmRow = new ActionRowBuilder()
        .addComponents(confirmButton, cancelButton);

    const embed = new EmbedBuilder()
        .setColor('#ff6b6b')
        .setTitle('⚠️ Confirmation Required')
        .setDescription(description)
        .setTimestamp();

    await interaction.reply({
        embeds: [embed],
        components: [confirmRow],
        ephemeral: true
    });
}

// Usage example for clear queue confirmation:
// await createConfirmationDialog(
//     interaction, 
//     'clear_queue', 
//     'Are you sure you want to clear the entire music queue?\nThis action cannot be undone.'
// );

// 2. PAGINATION PATTERN
function createPaginationButtons(currentPage, totalPages, baseId) {
    const prevButton = new ButtonBuilder()
        .setCustomId(`${baseId}_page_${currentPage - 1}`)
        .setLabel('◀️ Previous')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage === 0);

    const pageButton = new ButtonBuilder()
        .setCustomId(`${baseId}_page_info`)
        .setLabel(`Page ${currentPage + 1}/${totalPages}`)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true);

    const nextButton = new ButtonBuilder()
        .setCustomId(`${baseId}_page_${currentPage + 1}`)
        .setLabel('Next ▶️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentPage >= totalPages - 1);

    const refreshButton = new ButtonBuilder()
        .setCustomId(`${baseId}_refresh`)
        .setLabel('🔄 Refresh')
        .setStyle(ButtonStyle.Primary);

    return new ActionRowBuilder()
        .addComponents(prevButton, pageButton, nextButton, refreshButton);
}

// Usage for paginated queue:
// const paginationRow = createPaginationButtons(0, 5, 'queue');

// 3. DYNAMIC VOLUME CONTROL
function createVolumeControls(currentVolume, isMuted = false) {
    const muteButton = new ButtonBuilder()
        .setCustomId('toggle_mute')
        .setLabel(isMuted ? '🔊 Unmute' : '🔇 Mute')
        .setStyle(isMuted ? ButtonStyle.Success : ButtonStyle.Secondary);

    const volumeDownButton = new ButtonBuilder()
        .setCustomId('volume_down_5')
        .setLabel('🔉 -5')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentVolume <= 5 || isMuted);

    const volumeDisplay = new ButtonBuilder()
        .setCustomId('volume_display')
        .setLabel(`🔊 ${currentVolume}%`)
        .setStyle(ButtonStyle.Primary)
        .setDisabled(true);

    const volumeUpButton = new ButtonBuilder()
        .setCustomId('volume_up_5')
        .setLabel('🔊 +5')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(currentVolume >= 100 || isMuted);

    const maxVolumeButton = new ButtonBuilder()
        .setCustomId('volume_max')
        .setLabel('🔊 Max')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(currentVolume === 100 || isMuted);

    return new ActionRowBuilder()
        .addComponents(muteButton, volumeDownButton, volumeDisplay, volumeUpButton, maxVolumeButton);
}

// 4. QUEUE MANAGEMENT CONTROLS
function createQueueManagementButtons(queueLength, isShuffled = false, loop = false) {
    const shuffleButton = new ButtonBuilder()
        .setCustomId('shuffle_queue')
        .setLabel(isShuffled ? '🔀 Shuffled' : '🔀 Shuffle')
        .setStyle(isShuffled ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setDisabled(queueLength < 2);

    const loopButton = new ButtonBuilder()
        .setCustomId('toggle_loop')
        .setLabel(`🔁 Loop: ${loop ? 'ON' : 'OFF'}`)
        .setStyle(loop ? ButtonStyle.Success : ButtonStyle.Secondary);

    const clearButton = new ButtonBuilder()
        .setCustomId('clear_queue_confirm')
        .setLabel('🗑️ Clear Queue')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(queueLength === 0);

    const exportButton = new ButtonBuilder()
        .setCustomId('export_queue')
        .setLabel('📄 Export')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(queueLength === 0);

    const importButton = new ButtonBuilder()
        .setCustomId('import_queue')
        .setLabel('📁 Import')
        .setStyle(ButtonStyle.Secondary);

    return new ActionRowBuilder()
        .addComponents(shuffleButton, loopButton, clearButton, exportButton, importButton);
}

// 5. PLAYBACK CONTROL WITH STATUS
function createPlaybackControls(isPlaying, canSkip, canStop) {
    const playPauseButton = new ButtonBuilder()
        .setCustomId('toggle_playback')
        .setLabel(isPlaying ? '⏸️ Pause' : '▶️ Play')
        .setStyle(isPlaying ? ButtonStyle.Secondary : ButtonStyle.Success);

    const skipButton = new ButtonBuilder()
        .setCustomId('skip_song')
        .setLabel('⏭️ Skip')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!canSkip);

    const stopButton = new ButtonBuilder()
        .setCustomId('stop_music')
        .setLabel('⏹️ Stop')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(!canStop);

    const restartButton = new ButtonBuilder()
        .setCustomId('restart_song')
        .setLabel('↩️ Restart')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!canStop);

    return new ActionRowBuilder()
        .addComponents(playPauseButton, restartButton, skipButton, stopButton);
}

// 6. FILTER AND SEARCH CONTROLS
function createFilterButtons(activeFilters = {}) {
    const musicOnlyButton = new ButtonBuilder()
        .setCustomId('filter_music_only')
        .setLabel('🎵 Music Only')
        .setStyle(activeFilters.musicOnly ? ButtonStyle.Success : ButtonStyle.Secondary);

    const noShortsButton = new ButtonBuilder()
        .setCustomId('filter_no_shorts')
        .setLabel('⏱️ No Shorts')
        .setStyle(activeFilters.noShorts ? ButtonStyle.Success : ButtonStyle.Secondary);

    const hdOnlyButton = new ButtonBuilder()
        .setCustomId('filter_hd_only')
        .setLabel('🔍 HD Only')
        .setStyle(activeFilters.hdOnly ? ButtonStyle.Success : ButtonStyle.Secondary);

    const clearFiltersButton = new ButtonBuilder()
        .setCustomId('clear_filters')
        .setLabel('🗑️ Clear Filters')
        .setStyle(ButtonStyle.Danger);

    return new ActionRowBuilder()
        .addComponents(musicOnlyButton, noShortsButton, hdOnlyButton, clearFiltersButton);
}

// 7. AUTO-DISABLE TIMEOUT PATTERN
function createTimedButtons(components, timeoutMs = 300000) { // 5 minutes default
    const timeout = setTimeout(() => {
        // Disable all buttons after timeout
        components.forEach(row => {
            if (row.components) {
                row.components.forEach(button => {
                    if (button.data.style !== ButtonStyle.Link) {
                        button.setDisabled(true);
                    }
                });
            }
        });
    }, timeoutMs);

    return { components, timeout };
}

// Usage:
// const { components, timeout } = createTimedButtons([actionRow1, actionRow2]);
// // Clear timeout if user interacts: clearTimeout(timeout);

// 8. ERROR HANDLING FOR BUTTON INTERACTIONS
async function handleButtonError(interaction, error, debugMode = false) {
    console.error('Button interaction error:', error);
    
    const errorMessage = {
        content: debugMode ? 
            `❌ Button Error: ${error.message}` :
            '❌ Something went wrong! Please try again.',
        ephemeral: true
    };

    try {
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorMessage);
        } else {
            await interaction.reply(errorMessage);
        }
    } catch (followUpError) {
        console.error('Failed to send error message:', followUpError);
    }
}

// 9. BUTTON STATE PERSISTENCE
class ButtonStateManager {
    constructor() {
        this.states = new Map();
    }

    saveState(guildId, buttonId, state) {
        if (!this.states.has(guildId)) {
            this.states.set(guildId, new Map());
        }
        this.states.get(guildId).set(buttonId, state);
    }

    getState(guildId, buttonId) {
        return this.states.get(guildId)?.get(buttonId) || null;
    }

    clearGuildStates(guildId) {
        this.states.delete(guildId);
    }
}

// Usage:
// const buttonStates = new ButtonStateManager();
// buttonStates.saveState(guildId, 'queue_page', { currentPage: 0, totalPages: 5 });

// 10. PERMISSION-BASED BUTTON VISIBILITY
function createPermissionBasedButtons(userPermissions, isOwner = false) {
    const buttons = [];

    // Basic controls - everyone can use
    buttons.push(
        new ButtonBuilder()
            .setCustomId('queue_refresh')
            .setLabel('🔄 Refresh')
            .setStyle(ButtonStyle.Primary)
    );

    // DJ controls - requires DJ role or voice channel permissions
    if (userPermissions.canControlPlayback) {
        buttons.push(
            new ButtonBuilder()
                .setCustomId('toggle_playback')
                .setLabel('⏸️ Pause')
                .setStyle(ButtonStyle.Secondary),
            new ButtonBuilder()
                .setCustomId('skip_song')
                .setLabel('⏭️ Skip')
                .setStyle(ButtonStyle.Primary)
        );
    }

    // Admin controls - requires admin permissions
    if (userPermissions.isAdmin || isOwner) {
        buttons.push(
            new ButtonBuilder()
                .setCustomId('clear_queue')
                .setLabel('🗑️ Clear')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('force_disconnect')
                .setLabel('🔌 Disconnect')
                .setStyle(ButtonStyle.Danger)
        );
    }

    // Create rows (max 5 buttons per row)
    const rows = [];
    for (let i = 0; i < buttons.length; i += 5) {
        rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
    }

    return rows;
}

module.exports = {
    createConfirmationDialog,
    createPaginationButtons,
    createVolumeControls,
    createQueueManagementButtons,
    createPlaybackControls,
    createFilterButtons,
    createTimedButtons,
    handleButtonError,
    ButtonStateManager,
    createPermissionBasedButtons
};
