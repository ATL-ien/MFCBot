import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import * as profileDb from '../profilefunctions.js';
import { findProfile } from '../profilehelpers.js';

export const data = new SlashCommandBuilder()
    .setName('removesocial')
    .setDescription('Remove a social media link from a profile')
    .addStringOption(option =>
        option.setName('model')
            .setDescription('Profile name')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('platform')
            .setDescription('Social platform or custom name to remove')
            .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

export async function execute(interaction) {
    const modelName = interaction.options.getString('model');
    const platform = interaction.options.getString('platform');
    
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
        
        // Remove the social link
        await profileDb.removeSocial(identifier, platform);
        
        await interaction.reply({
            content: `✅ Removed **${platform}** from ${profile.model_name}'s profile`,
            ephemeral: true
        });
        
        console.log(`Removed ${platform} for ${profile.model_name}`);
        
    } catch (error) {
        console.error('Error removing social link:', error);
        await interaction.reply({
            content: `An error occurred: ${error.message}`,
            ephemeral: true
        });
    }
}
