import { SlashCommandBuilder } from 'discord.js';
import * as customShareDb from '../customsharefunctions.js';

export const data = new SlashCommandBuilder()
    .setName('listshares')
    .setDescription('List all custom share shortcuts')
    .addStringOption(option =>
        option.setName('model')
            .setDescription('Filter by model name (optional)')
            .setRequired(false));

export async function execute(interaction) {
    const modelName = interaction.options.getString('model');
    
    try {
        let shares;
        
        if (modelName) {
            shares = await customShareDb.listCustomShares(modelName);
        } else {
            shares = await customShareDb.getAllCustomShares();
        }
        
        if (shares.length === 0) {
            const message = modelName 
                ? `No custom share shortcuts found for ${modelName}.`
                : 'No custom share shortcuts have been added yet.';
            
            await interaction.reply({ content: message, ephemeral: true });
            return;
        }
        
        // Group by model
        const byModel = {};
        for (const share of shares) {
            if (!byModel[share.model_name]) {
                byModel[share.model_name] = [];
            }
            byModel[share.model_name].push(share);
        }
        
        let response = '📋 **Custom Share Shortcuts**\n\n';
        
        for (const [model, modelShares] of Object.entries(byModel)) {
            response += `**${model}:**\n`;
            for (const share of modelShares) {
                const typeEmoji = {
                    albums: '📁',
                    clubs: '🎥',
                    videos: '📹',
                    goals: '🎯',
                    items: '🛍️'
                }[share.content_type] || '📎';
                
                response += `  ${typeEmoji} \`/${share.shortcut}\``;
                if (share.title) {
                    response += ` - ${share.title}`;
                }
                response += `\n`;
            }
            response += '\n';
        }
        
        response += `*Use \`/share model:ModelName shortcut:shortcut\` to post*`;
        
        await interaction.reply({ content: response, ephemeral: true });
        
    } catch (error) {
        console.error('Error listing custom shares:', error);
        await interaction.reply({ 
            content: 'An error occurred while listing custom shares.', 
            ephemeral: true 
        });
    }
}
