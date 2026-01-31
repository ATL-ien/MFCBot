import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import * as shareContent from '../sharecontent.js';
import * as shareThumbnails from '../sharethumbnails.js';
import * as db from '../databasefunctions.js';
import fetch from 'node-fetch';

export const data = new SlashCommandBuilder()
    .setName('catalogshare')
    .setDescription('View all share content for a model with details')
    .addStringOption(option =>
        option.setName('model')
            .setDescription('Model name')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('type')
            .setDescription('Filter by content type (optional)')
            .setRequired(false)
            .addChoices(
                { name: 'Albums', value: 'albums' },
                { name: 'Clubs', value: 'clubs' },
                { name: 'Videos', value: 'videos' },
                { name: 'Goals', value: 'goals' },
                { name: 'Items', value: 'items' },
                { name: 'Tip Menus', value: 'tipmenus' },
                { name: 'Polls', value: 'polls' }
            ))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

export async function execute(interaction) {
    const modelName = interaction.options.getString('model');
    const filterType = interaction.options.getString('type');
    
    try {
        await interaction.deferReply({ ephemeral: true });
        
        // Get model from database
        const models = await db.getmodels();
        const model = models.find(m => m.modelname.toLowerCase() === modelName.toLowerCase());
        
        if (!model) {
            await interaction.editReply({
                content: `❌ Model "${modelName}" not found in tracked models.`
            });
            return;
        }
        
        // Get MFC username
        const url = `https://api-edge.myfreecams.com/recommend?model_id=${model.id}&version2=1&=`;
        const apiResponse = await fetch(url);
        const apiData = await apiResponse.json();
        
        let username = null;
        if (apiData.result && apiData.result.users && apiData.result.users[model.id]) {
            username = apiData.result.users[model.id].username;
        }
        
        if (!username) {
            await interaction.editReply({
                content: `❌ Could not find MFC username for ${modelName}.`
            });
            return;
        }
        
        await interaction.editReply({
            content: `🔍 Fetching share content for ${username}...`
        });
        
        // Get all share content
        const allContent = await shareContent.getShareContent(username);
        
        if (!allContent) {
            await interaction.editReply({
                content: `❌ Could not fetch share content for ${username}.`
            });
            return;
        }
        
        // Filter by type if specified
        const contentTypes = filterType ? [filterType] : ['albums', 'clubs', 'videos', 'goals', 'items', 'tipmenus', 'polls'];
        
        let totalItems = 0;
        const embeds = [];
        
        const emojis = {
            albums: '📁',
            clubs: '🎥',
            videos: '📹',
            goals: '🎯',
            items: '🛍️',
            tipmenus: '💰',
            polls: '📊'
        };
        
        const colors = {
            albums: 0x3498db,
            clubs: 0xe74c3c,
            videos: 0x9b59b6,
            goals: 0xf39c12,
            items: 0x2ecc71,
            tipmenus: 0xe67e22,
            polls: 0x1abc9c
        };
        
        for (const type of contentTypes) {
            const ids = allContent[type] || [];
            if (ids.length === 0) continue;
            
            totalItems += ids.length;
            
            for (const contentId of ids) {
                try {
                    // Fetch metadata for each item (if available)
                    let metadata = null;
                    if (['albums', 'clubs', 'videos', 'goals', 'items'].includes(type)) {
                        metadata = await shareThumbnails.getContentMetadata(type, contentId);
                    }
                    
                    const emoji = emojis[type];
                    const color = colors[type];
                    
                    // Build share URL
                    const baseUrls = {
                        albums: 'https://share.myfreecams.com/a/',
                        clubs: 'https://share.myfreecams.com/m/',
                        videos: 'https://share.myfreecams.com/v/',
                        goals: 'https://share.myfreecams.com/g/',
                        items: 'https://share.myfreecams.com/s/',
                        tipmenus: 'https://share.myfreecams.com/tipmenu/',
                        polls: 'https://share.myfreecams.com/poll/'
                    };
                    const shareUrl = baseUrls[type] + contentId;
                    
                    const embed = {
                        author: {
                            name: username,
                            url: `https://share.myfreecams.com/${username}`
                        },
                        title: `${emoji} ${metadata?.title || 'Untitled'}`,
                        url: shareUrl,
                        color: color,
                        fields: []
                    };
                    
                    // Add description (if metadata available)
                    if (metadata?.description) {
                        embed.description = metadata.description.substring(0, 200);
                    }
                    
                    // Add thumbnail (if metadata available)
                    if (metadata?.thumbnail) {
                        embed.thumbnail = { url: metadata.thumbnail };
                    }
                    
                    // Add type-specific fields
                    if (metadata?.price) {
                        embed.fields.push({
                            name: '💰 Price',
                            value: metadata.price,
                            inline: true
                        });
                    }
                    
                    if (metadata?.photoCount) {
                        embed.fields.push({
                            name: '📸 Photos',
                            value: metadata.photoCount.toString(),
                            inline: true
                        });
                    }
                    
                    if (metadata?.progress) {
                        embed.fields.push({
                            name: '🎯 Progress',
                            value: metadata.progress,
                            inline: true
                        });
                    }
                    
                    // Add ID for reference
                    embed.footer = { text: `ID: ${contentId}` };
                    
                    embeds.push(embed);
                    
                    // Small delay to avoid rate limits
                    await new Promise(resolve => setTimeout(resolve, 300));
                    
                } catch (error) {
                    console.error(`Error fetching metadata for ${type}/${contentId}:`, error);
                }
            }
        }
        
        if (embeds.length === 0) {
            await interaction.editReply({
                content: `No ${filterType || 'share content'} found for ${username}.`
            });
            return;
        }
        
        // Send summary first
        let summary = `**📋 Share Content Catalog for ${username}**\n\n`;
        summary += `**Total items:** ${totalItems}\n`;
        if (filterType) {
            summary += `**Showing:** ${filterType} only\n`;
        }
        summary += `\nShowing all items in batches of 10...`;
        
        await interaction.editReply({ content: summary });
        
        // Send embeds in batches (Discord limit: 10 embeds per message)
        const channel = interaction.channel;
        let batchCount = 0;
        
        for (let i = 0; i < embeds.length; i += 10) {
            const batch = embeds.slice(i, i + 10);
            batchCount++;
            
            await channel.send({ 
                content: `**Batch ${batchCount}/${Math.ceil(embeds.length / 10)}**`,
                embeds: batch 
            });
            
            // Delay between batches
            if (i + 10 < embeds.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        console.log(`Sent share catalog for ${username} (${embeds.length} items in ${batchCount} batches)`);
        
    } catch (error) {
        console.error('Error creating share catalog:', error);
        
        if (interaction.deferred) {
            await interaction.editReply({
                content: `An error occurred: ${error.message}`
            });
        }
    }
}
