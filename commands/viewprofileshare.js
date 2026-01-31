import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import * as profileDb from '../profilefunctions.js';
import * as customShareDb from '../customsharefunctions.js';
import * as db from '../databasefunctions.js';

export const data = new SlashCommandBuilder()
    .setName('viewprofileshare')
    .setDescription('View all MFC Share shortcuts for a model')
    .addStringOption(option =>
        option.setName('model')
            .setDescription('Model name')
            .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

export async function execute(interaction) {
    const modelName = interaction.options.getString('model');
    
    try {
        await interaction.deferReply();
        
        // Get model from database
        const models = await db.getmodels();
        const model = models.find(m => m.modelname.toLowerCase() === modelName.toLowerCase());
        
        if (!model) {
            await interaction.editReply({
                content: `❌ Model "${modelName}" not found in tracked models.`
            });
            return;
        }
        
        // Get all custom share shortcuts for this model
        const shortcuts = await customShareDb.getModelShares(modelName.toLowerCase());
        
        if (!shortcuts || shortcuts.length === 0) {
            await interaction.editReply({
                content: `📁 ${model.modelname} has no share shortcuts saved yet.\n\n` +
                         `Use \`/addshare\` to create shortcuts for albums, clubs, videos, etc.`
            });
            return;
        }
        
        // Sort shortcuts by type, then by shortcut name
        const sortedShortcuts = shortcuts.sort((a, b) => {
            if (a.content_type !== b.content_type) {
                return a.content_type.localeCompare(b.content_type);
            }
            return a.shortcut.localeCompare(b.shortcut);
        });
        
        // Build embed
        const emojis = {
            albums: '📁',
            clubs: '🎥',
            videos: '📹',
            goals: '🎯',
            items: '🛍️'
        };
        
        const colors = {
            albums: 0x3498db,
            clubs: 0xe74c3c,
            videos: 0x9b59b6,
            goals: 0xf39c12,
            items: 0x2ecc71
        };
        
        const embed = {
            title: `📁 ${model.modelname}'s Share Shortcuts`,
            description: `Total: ${sortedShortcuts.length} shortcut${sortedShortcuts.length !== 1 ? 's' : ''}`,
            color: 0x3498db,
            fields: [],
            footer: {
                text: `Use /share shortcut:name to post any of these`
            }
        };
        
        // Group by type
        const byType = {};
        for (const shortcut of sortedShortcuts) {
            if (!byType[shortcut.content_type]) {
                byType[shortcut.content_type] = [];
            }
            byType[shortcut.content_type].push(shortcut);
        }
        
        // Add fields by type
        for (const [type, items] of Object.entries(byType)) {
            const emoji = emojis[type] || '📎';
            const typeTitle = type.charAt(0).toUpperCase() + type.slice(1);
            
            let fieldValue = '';
            for (const item of items) {
                const title = item.title || 'Untitled';
                const url = `https://share.myfreecams.com/${type.charAt(0)}/${item.content_id}`;
                fieldValue += `**${item.shortcut}** - [${title}](${url})\n`;
            }
            
            embed.fields.push({
                name: `${emoji} ${typeTitle} (${items.length})`,
                value: fieldValue || 'None',
                inline: false
            });
        }
        
        await interaction.editReply({ embeds: [embed] });
        
    } catch (error) {
        console.error('Error viewing profile share shortcuts:', error);
        
        if (interaction.deferred) {
            await interaction.editReply({
                content: `An error occurred: ${error.message}`
            });
        }
    }
}
