import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import * as customShareDb from '../customsharefunctions.js';

export const data = new SlashCommandBuilder()
    .setName('deleteshare')
    .setDescription('Delete a custom share shortcut')
    .addStringOption(option =>
        option.setName('model')
            .setDescription('Model name')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('shortcut')
            .setDescription('Shortcut name to delete')
            .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

export async function execute(interaction) {
    const modelName = interaction.options.getString('model');
    const shortcut = interaction.options.getString('shortcut');
    
    try {
        const numRemoved = await customShareDb.deleteCustomShare(modelName, shortcut);
        
        if (numRemoved > 0) {
            await interaction.reply({ 
                content: `✅ Deleted shortcut \`/${shortcut}\` for ${modelName}.`, 
                ephemeral: true 
            });
            console.log(`Deleted custom share: ${modelName}/${shortcut}`);
        } else {
            await interaction.reply({ 
                content: `❌ No shortcut "${shortcut}" found for ${modelName}.`, 
                ephemeral: true 
            });
        }
        
    } catch (error) {
        console.error('Error deleting custom share:', error);
        await interaction.reply({ 
            content: 'An error occurred while deleting the custom share.', 
            ephemeral: true 
        });
    }
}
