import { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import * as profileDb from '../profilefunctions.js';
import * as customShareDb from '../customsharefunctions.js';
import * as shareContent from '../sharecontent.js';
import { findProfile } from '../profilehelpers.js';
import fetch from 'node-fetch';

export const data = new SlashCommandBuilder()
    .setName('viewprofile')
    .setDescription('View a profile')
    .addStringOption(option =>
        option.setName('model')
            .setDescription('Profile name')
            .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

export async function execute(interaction) {
    const modelName = interaction.options.getString('model');
    
    try {
        await interaction.deferReply();
        
        // Find profile
        const result = await findProfile(modelName, true);
        
        if (!result) {
            await interaction.editReply({
                content: `❌ Profile "${modelName}" not found.\n\nUse a create command first.`
            });
            return;
        }
        
        const { profile, isTracked } = result;
        
        // Build the embed and send with pagination if 2 images exist
        const hasImage1 = profile.profile_image_1?.url;
        const hasImage2 = profile.profile_image_2?.url;
        const hasBothImages = hasImage1 && hasImage2;
        
        // If both images exist, show with pagination buttons
        if (hasBothImages) {
            await sendProfileWithPagination(interaction, profile, isTracked);
        } else {
            // Single image or no images - show normally
            const embed = await buildProfileEmbed(profile, isTracked, modelName);
            await interaction.editReply({ embeds: [embed] });
        }
        
    } catch (error) {
        console.error('Error viewing profile:', error);
        
        if (interaction.deferred) {
            await interaction.editReply({
                content: `An error occurred: ${error.message}`
            });
        }
    }
}

async function sendProfileWithPagination(interaction, profile, isTracked) {
    let currentImageIndex = 0;
    const modelName = profile.model_name;
    
    // Build initial embed with image 1
    const embed = await buildProfileEmbed(profile, isTracked, modelName, 1);
    
    // Create pagination buttons
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('profile_prev')
                .setLabel('◀ Previous')
                .setStyle(ButtonStyle.Primary)
                .setDisabled(true), // Start on image 1
            new ButtonBuilder()
                .setCustomId('profile_page')
                .setLabel('Image 1/2')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
            new ButtonBuilder()
                .setCustomId('profile_next')
                .setLabel('Next ▶')
                .setStyle(ButtonStyle.Primary)
        );
    
    const message = await interaction.editReply({ 
        embeds: [embed],
        components: [row]
    });
    
    // Create collector for button interactions
    const collector = message.createMessageComponentCollector({
        filter: i => i.user.id === interaction.user.id,
        time: 300000 // 5 minutes
    });
    
    collector.on('collect', async i => {
        if (i.customId === 'profile_next') {
            currentImageIndex = 1;
        } else if (i.customId === 'profile_prev') {
            currentImageIndex = 0;
        }
        
        // Update embed with correct image
        const newEmbed = await buildProfileEmbed(profile, isTracked, modelName, currentImageIndex + 1);
        
        // Update buttons
        const newRow = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('profile_prev')
                    .setLabel('◀ Previous')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(currentImageIndex === 0),
                new ButtonBuilder()
                    .setCustomId('profile_page')
                    .setLabel(`Image ${currentImageIndex + 1}/2`)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId('profile_next')
                    .setLabel('Next ▶')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(currentImageIndex === 1)
            );
        
        await i.update({
            embeds: [newEmbed],
            components: [newRow]
        });
    });
    
    collector.on('end', async () => {
        // Disable buttons after timeout
        try {
            const disabledRow = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('profile_prev')
                        .setLabel('◀ Previous')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('profile_page')
                        .setLabel(`Image ${currentImageIndex + 1}/2`)
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('profile_next')
                        .setLabel('Next ▶')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(true)
                );
            
            await message.edit({ components: [disabledRow] });
        } catch (error) {
            // Message might have been deleted
        }
    });
}

async function buildProfileEmbed(profile, isTracked, modelName, imageNumber = null) {
    // Build embed
    const embed = {
        title: `${profile.model_name.toUpperCase()} - Profile`,
        color: 0xe91e63,
        fields: [],
        footer: {
            text: `Last updated: ${new Date(profile.updated_at).toLocaleString()}`
        }
    };
    
    // Add profile type badge
    const typeEmojis = {
        tracked: '📊',
        movie_actor: '🎬',
        adult_star: '⭐',
        celebrity: '🌟'
    };
    embed.title = `${typeEmojis[profile.profile_type] || '👤'} ${embed.title}`;
    
    // Add images based on imageNumber (for pagination)
    if (imageNumber === 1 && profile.profile_image_1?.url) {
        embed.image = { url: profile.profile_image_1.url };
    } else if (imageNumber === 2 && profile.profile_image_2?.url) {
        embed.image = { url: profile.profile_image_2.url };
    } else if (!imageNumber) {
        // No pagination - use original logic
        if (profile.profile_image_1?.url && profile.profile_image_2?.url) {
            embed.image = { url: profile.profile_image_1.url };
            embed.thumbnail = { url: profile.profile_image_2.url };
        } else if (profile.profile_image_1?.url) {
            embed.image = { url: profile.profile_image_1.url };
        } else if (profile.profile_image_2?.url) {
            embed.image = { url: profile.profile_image_2.url };
        }
    }
    
    // MFC Stats section (only for tracked models)
    if (isTracked && profile.model_id) {
        let statsText = '';
        let mfcUsername = null;
        
        try {
            const url = `https://api-edge.myfreecams.com/recommend?model_id=${profile.model_id}&version2=1&=`;
            const apiResponse = await fetch(url);
            const apiData = await apiResponse.json();
            
            if (apiData.result?.users?.[profile.model_id]) {
                const userData = apiData.result.users[profile.model_id];
                mfcUsername = userData.username;
                if (userData.cam_score) {
                    statsText += `**Camscore:** ${userData.cam_score.toFixed(1)}\n`;
                }
            }
        } catch (error) {
            console.error('Error fetching MFC data:', error);
        }
        
        // Get Miss MFC rank
        try {
            const missMfcUrl = 'https://api-edge.myfreecams.com/missmfc';
            const missMfcResponse = await fetch(missMfcUrl);
            const missMfcBody = await missMfcResponse.json();
            
            if (missMfcBody.result?.rankings?.users) {
                const rankData = missMfcBody.result.rankings.users.find(r => r.user_id.toString() === profile.model_id);
                if (rankData) {
                    statsText += `**Miss MFC Rank:** #${rankData.rank}\n`;
                }
            }
        } catch (error) {
            console.error('Error fetching Miss MFC rank:', error);
        }
        
        if (mfcUsername) {
            statsText += `**Profile:** [${mfcUsername}](https://profiles.myfreecams.com/${mfcUsername})\n`;
        }
        
        if (statsText) {
            embed.fields.push({
                name: '📊 MFC Stats',
                value: statsText,
                inline: false
            });
        }
        
        // Get share content stats
        if (mfcUsername) {
            try {
                const allContent = await shareContent.getShareContent(mfcUsername);
                if (allContent) {
                    const shareStats = {
                        albums: allContent.albums?.length || 0,
                        clubs: allContent.clubs?.length || 0,
                        videos: allContent.videos?.length || 0,
                        goals: allContent.goals?.length || 0,
                        items: allContent.items?.length || 0
                    };
                    shareStats.total = shareStats.albums + shareStats.clubs + shareStats.videos + shareStats.goals + shareStats.items;
                    
                    if (shareStats.total > 0) {
                        let shareText = `**Total:** ${shareStats.total} items\n`;
                        if (shareStats.albums > 0) shareText += `📁 Albums: ${shareStats.albums}\n`;
                        if (shareStats.clubs > 0) shareText += `🎥 Clubs: ${shareStats.clubs}\n`;
                        if (shareStats.videos > 0) shareText += `📹 Videos: ${shareStats.videos}\n`;
                        if (shareStats.goals > 0) shareText += `🎯 Goals: ${shareStats.goals}\n`;
                        if (shareStats.items > 0) shareText += `🛍️ Items: ${shareStats.items}\n`;
                        
                        const shortcuts = await customShareDb.getModelShares(modelName.toLowerCase()) || [];
                        if (shortcuts.length > 0) {
                            shareText += `\n*${shortcuts.length} shortcut${shortcuts.length !== 1 ? 's' : ''} saved*`;
                        }
                        
                        embed.fields.push({
                            name: '📁 MFC Share Content',
                            value: shareText,
                            inline: false
                        });
                    }
                }
            } catch (error) {
                console.error('Error fetching share content:', error);
            }
        }
    }
    
    // Basic Info section
    let infoText = '';
    if (profile.birthday) {
        infoText += `**Birthday:** ${profile.birthday} 🎂\n`;
    }
    if (profile.birthplace) {
        infoText += `**Birthplace:** ${profile.birthplace}\n`;
    }
    if (profile.location) {
        infoText += `**Location:** ${profile.location}\n`;
    }
    if (profile.height) {
        infoText += `**Height:** ${profile.height}\n`;
    }
    if (profile.measurements) {
        infoText += `**Measurements:** ${profile.measurements}\n`;
    }
    if (profile.ethnicity) {
        infoText += `**Ethnicity:** ${profile.ethnicity}\n`;
    }
    if (profile.years_active) {
        infoText += `**Years Active:** ${profile.years_active}\n`;
    }
    if (profile.status) {
        infoText += `**Status:** ${profile.status}\n`;
    }
    if (profile.category) {
        infoText += `**Category:** ${profile.category}\n`;
    }
    if (profile.known_for) {
        infoText += `**Known For:** ${profile.known_for}\n`;
    }
    
    if (infoText) {
        embed.fields.push({
            name: '👤 Info',
            value: infoText,
            inline: true
        });
    }
    
    // Movie Actor: Top Movies
    if (profile.profile_type === 'movie_actor' && profile.top_movies?.length > 0) {
        let movieText = '';
        for (const movie of profile.top_movies.slice(0, 3)) {
            movieText += `**${movie.title}** (${movie.year})\n`;
        }
        if (profile.top_movies.length > 3) {
            movieText += `\n*+${profile.top_movies.length - 3} more - use \`/listmovies\`*`;
        }
        
        embed.fields.push({
            name: '🎬 Top Films',
            value: movieText,
            inline: false
        });
    }
    
    // Movie Actor: Upcoming Movies
    if (profile.profile_type === 'movie_actor' && profile.upcoming_movies?.length > 0) {
        let upcomingText = '';
        for (const movie of profile.upcoming_movies.slice(0, 3)) {
            upcomingText += `**${movie.title}** (${movie.release_date})\n`;
        }
        if (profile.upcoming_movies.length > 3) {
            upcomingText += `\n*+${profile.upcoming_movies.length - 3} more*`;
        }
        
        embed.fields.push({
            name: '🎥 Upcoming',
            value: upcomingText,
            inline: false
        });
    }
    
    // Adult Star: Filmography Count
    if (profile.profile_type === 'adult_star' && profile.movie_count > 0) {
        embed.fields.push({
            name: '🎬 Filmography',
            value: `**Total Movies:** ${profile.movie_count}\n*Use \`/listmovies\` to view all*`,
            inline: false
        });
    }
    
    // Socials section
    let socialsText = '';
    const socials = profile.socials || {};
    
    const socialLinks = [
        { key: 'twitter', label: 'Twitter' },
        { key: 'instagram', label: 'Instagram' },
        { key: 'onlyfans', label: 'OnlyFans' },
        { key: 'throne', label: 'Throne' },
        { key: 'mfc_share', label: 'MFC Share' },
        { key: 'amazon', label: 'Amazon' },
        { key: 'pornhub', label: 'Pornhub' },
        { key: 'manyvids', label: 'ManyVids' },
        { key: 'imdb', label: 'IMDb' },
        { key: 'wikipedia', label: 'Wikipedia' },
        { key: 'tiktok', label: 'TikTok' },
        { key: 'youtube', label: 'YouTube' }
    ];
    
    for (const social of socialLinks) {
        if (socials[social.key]) {
            socialsText += `[${social.label}](${socials[social.key]}) `;
        }
    }
    
    // Add custom socials
    if (socials.custom?.length > 0) {
        socialsText += '\n';
        for (const custom of socials.custom) {
            socialsText += `**${custom.name}:** ${custom.value}\n`;
        }
    }
    
    if (socialsText) {
        embed.fields.push({
            name: '🔗 Socials',
            value: socialsText.trim(),
            inline: true
        });
    }
    
    // Awards
    if (profile.awards) {
        embed.fields.push({
            name: '🏆 Awards',
            value: profile.awards,
            inline: false
        });
    }
    
    // Gifs section
    if (profile.gifs?.length > 0) {
        const gifNames = profile.gifs.slice(0, 10).map(g => g.name).join(' • ');
        const moreText = profile.gifs.length > 10 ? ` • +${profile.gifs.length - 10} more` : '';
        embed.fields.push({
            name: `🎬 Gifs (${profile.gifs.length})`,
            value: gifNames + moreText,
            inline: false
        });
    }
    
    // Notes section
    if (profile.notes) {
        embed.fields.push({
            name: '📝 Notes',
            value: profile.notes,
            inline: false
        });
    }
    
    // Show helpful message if profile is empty
    if (embed.fields.length === 0) {
        embed.description = `*This profile is empty. Use \`/editprofile\` to add information!*`;
    }
    
    return embed;
}
