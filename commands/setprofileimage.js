import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import * as profileDb from '../profilefunctions.js';
import { findProfile } from '../profilehelpers.js';

export const data = new SlashCommandBuilder()
    .setName('setprofileimage')
    .setDescription('Set a profile image')
    .addStringOption(option =>
        option.setName('model')
            .setDescription('Profile name')
            .setRequired(true))
    .addIntegerOption(option =>
        option.setName('slot')
            .setDescription('Image slot (1 or 2)')
            .setRequired(true)
            .addChoices(
                { name: 'Image 1', value: 1 },
                { name: 'Image 2', value: 2 }
            ))
    .addStringOption(option =>
        option.setName('url')
            .setDescription('Image URL')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('description')
            .setDescription('Image description (e.g., "Face", "Full Body", "Clothed", "Lingerie")')
            .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

export async function execute(interaction) {
    const modelName = interaction.options.getString('model');
    const slot = interaction.options.getInteger('slot');
    const url = interaction.options.getString('url');
    const description = interaction.options.getString('description') || `Image ${slot}`;
    
    try {
        // Validate URL format
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            await interaction.reply({
                content: '❌ Invalid URL. Must start with http:// or https://',
                ephemeral: true
            });
            return;
        }
        
        // Find profile (works for tracked models AND custom profiles)
        const result = await findProfile(modelName, true);
        
        if (!result) {
            await interaction.reply({
                content: `❌ Profile "${modelName}" not found.\n\nUse a create command first.`,
                ephemeral: true
            });
            return;
        }
        
        const { profile, identifier } = result;
        
        // Set the image
        await profileDb.setProfileImage(identifier, slot, url, description);
        
        await interaction.reply({
            content: `✅ Set **Image ${slot}** for ${profile.model_name}\n\n` +
                     `**Description:** ${description}\n` +
                     `**URL:** ${url}\n\n` +
                     `*Use \`/viewprofile model:${modelName}\` to see the profile.*`,
            ephemeral: true
        });
        
        console.log(`Set image ${slot} for ${profile.model_name}: ${description}`);
        
    } catch (error) {
        console.error('Error setting profile image:', error);
        await interaction.reply({
            content: `An error occurred: ${error.message}`,
            ephemeral: true
        });
    }
}
