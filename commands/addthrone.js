import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import * as throneDb from '../thronedbfunctions.js';
import * as throne from '../thronefunctions.js';
import * as db from '../databasefunctions.js';

export const data = new SlashCommandBuilder()
    .setName('addthrone')
    .setDescription('Add Throne wishlist URL for a model')
    .addStringOption(option =>
        option.setName('model')
            .setDescription('Model name')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('url')
            .setDescription('Throne URL (e.g., https://throne.com/username)')
            .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

export async function execute(interaction) {
    const modelName = interaction.options.getString('model');
    const throneUrl = interaction.options.getString('url');
    
    try {
        await interaction.deferReply({ ephemeral: true });
        
        // Validate URL format
        if (!throneUrl.includes('throne.com/')) {
            await interaction.editReply({
                content: '❌ Invalid Throne URL. Format should be: https://throne.com/username'
            });
            return;
        }
        
        // Get model from database
        const models = await db.getmodels();
        const model = models.find(m => m.modelname.toLowerCase() === modelName.toLowerCase());
        
        if (!model) {
            await interaction.editReply({
                content: `❌ Model "${modelName}" not found in tracked models.`
            });
            return;
        }
        
        // Test if we can fetch the wishlist
        await interaction.editReply({
            content: `🔍 Testing Throne URL...`
        });
        
        const items = await throne.getThroneWishlist(throneUrl);
        
        if (!items) {
            await interaction.editReply({
                content: `❌ Could not fetch wishlist from that URL. Make sure the URL is correct and the wishlist is public.`
            });
            return;
        }
        
        // Save to database
        await throneDb.setThroneUrl(model.modelname, model.id, throneUrl);
        
        const username = throne.getThroneUsername(throneUrl);
        
        await interaction.editReply({
            content: `✅ **Throne wishlist added!**\n\n` +
                     `**Model:** ${model.modelname}\n` +
                     `**Throne:** ${username}\n` +
                     `**Items found:** ${items.length}\n\n` +
                     `Use \`/enablethrone model:${model.modelname}\` to start monitoring for new items!`
        });
        
        console.log(`Added Throne URL for ${model.modelname}: ${throneUrl}`);
        
    } catch (error) {
        console.error('Error adding Throne URL:', error);
        await interaction.editReply({
            content: 'An error occurred while adding the Throne URL.'
        });
    }
}
