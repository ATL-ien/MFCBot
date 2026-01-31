import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import * as profileDb from '../profilefunctions.js';
import { findProfile } from '../profilehelpers.js';

export const data = new SlashCommandBuilder()
    .setName('removeprofilegif')
    .setDescription('Remove a gif from a profile')
    .addStringOption(option =>
        option.setName('model')
            .setDescription('Profile name')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('name')
            .setDescription('Gif name to remove')
            .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

export async function execute(interaction) {
    const modelName = interaction.options.getString('model');
    const gifName = interaction.options.getString('name').toLowerCase();
    
    try {
        // Find profile
        const result = await findProfile(modelName, false);
        
        if (!result) {
            await interaction.reply({
                content: `❌ No profile exists for "${modelName}".`,
                ephemeral: true
            });
            return;
        }
        
        const { profile, identifier } = result;
        
        // Check if gif exists
        const gifExists = profile.gifs && profile.gifs.some(g => g.name === gifName);
        
        if (!gifExists) {
            await interaction.reply({
                content: `❌ No gif named "${gifName}" found in ${profile.model_name}'s profile.\n\n` +
                         `Use \`/viewprofilegifs model:${modelName}\` to see available gifs.`,
                ephemeral: true
            });
            return;
        }
        
        // Remove the gif
        await profileDb.removeProfileGif(identifier, gifName);
        
        await interaction.reply({
            content: `✅ Removed gif **"${gifName}"** from ${profile.model_name}'s profile`,
            ephemeral: true
        });
        
        console.log(`Removed gif "${gifName}" from ${profile.model_name}'s profile`);
        
    } catch (error) {
        console.error('Error removing profile gif:', error);
        await interaction.reply({
            content: `An error occurred: ${error.message}`,
            ephemeral: true
        });
    }
}
