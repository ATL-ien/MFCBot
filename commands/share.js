import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import * as customShareDb from '../customsharefunctions.js';
import * as shareThumbnails from '../sharethumbnails.js';

export const data = new SlashCommandBuilder()
    .setName('share')
    .setDescription('Post a custom share shortcut')
    .addStringOption(option =>
        option.setName('shortcut')
            .setDescription('Shortcut name')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('model')
            .setDescription('Model name')
            .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

export async function execute(interaction) {
    const shortcut = interaction.options.getString('shortcut').toLowerCase();
    const modelName = interaction.options.getString('model');
    
    try {
        await interaction.deferReply();
        
        // Get the custom share
        const share = await customShareDb.getCustomShare(modelName, shortcut);
        
        if (!share) {
            await interaction.editReply({
                content: `❌ Shortcut "${shortcut}" not found for ${modelName}.`
            });
            return;
        }
        
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
        
        const shareUrl = baseUrls[share.content_type] + share.content_id;
        
        // Emojis and colors for different types
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
        
        const emoji = emojis[share.content_type] || '🔗';
        const color = colors[share.content_type] || 0x95a5a6;
        
        // Try to get metadata (only works for albums, clubs, videos, goals, items)
        let metadata = null;
        const metadataTypes = ['albums', 'clubs', 'videos', 'goals', 'items'];
        
        if (metadataTypes.includes(share.content_type)) {
            try {
                metadata = await shareThumbnails.getContentMetadata(share.content_type, share.content_id);
            } catch (error) {
                console.log(`Could not fetch metadata for ${share.content_type}/${share.content_id}`);
            }
        }
        
        // Build embed
        const embed = {
            author: {
                name: modelName,
                url: `https://share.myfreecams.com/${modelName}`
            },
            title: `${emoji} ${share.title || metadata?.title || 'Share Content'}`,
            url: shareUrl,
            color: color,
            fields: []
        };
        
        // Add description if available
        if (metadata?.description) {
            embed.description = metadata.description;
        }
        
        // Add thumbnail/image if available
        if (metadata?.thumbnail) {
            embed.image = { url: metadata.thumbnail };
        }
        
        // Add metadata fields if available
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
        
        // For tip menus and polls, add a note since they don't have rich metadata
        if (share.content_type === 'tipmenus') {
            if (embed.fields.length === 0) {
                embed.description = 'View the full tip menu by clicking the link above.';
            }
        } else if (share.content_type === 'polls') {
            if (embed.fields.length === 0) {
                embed.description = 'View and vote in the poll by clicking the link above.';
            }
        }
        
        await interaction.editReply({ embeds: [embed] });
        
        console.log(`Posted share shortcut: ${shortcut} for ${modelName}`);
        
    } catch (error) {
        console.error('Error posting share:', error);
        
        if (interaction.deferred) {
            await interaction.editReply({
                content: 'An error occurred while posting the share content.'
            });
        }
    }
}
