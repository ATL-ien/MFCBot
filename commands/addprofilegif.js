import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import * as profileDb from '../profilefunctions.js';
import { findProfile } from '../profilehelpers.js';

export const data = new SlashCommandBuilder()
    .setName('addprofilegif')
    .setDescription('Add a gif to a profile')
    .addStringOption(option =>
        option.setName('model')
            .setDescription('Profile name')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('name')
            .setDescription('Gif name/shortcut (e.g., "wave", "dance", "laugh")')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('url')
            .setDescription('Gif URL')
            .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

export async function execute(interaction) {
    const modelName = interaction.options.getString('model');
    const gifName = interaction.options.getString('name').toLowerCase();
    const url = interaction.options.getString('url');
    
    try {
        // Validate URL
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
        
        // Add the gif
        await profileDb.addProfileGif(identifier, gifName, url);
        
        await interaction.reply({
            content: `✅ Added gif **"${gifName}"** to ${profile.model_name}'s profile\n\n` +
                     `**URL:** ${url}\n\n` +
                     `*Use \`/viewprofilegifs model:${modelName}\` to see all gifs*\n` +
                     `*Use \`/showprofilegif model:${modelName} name:${gifName}\` to display this gif*`,
            ephemeral: true
        });
        
        console.log(`Added gif "${gifName}" to ${profile.model_name}'s profile`);
        
    } catch (error) {
        console.error('Error adding profile gif:', error);
        
        if (error.message.includes('already exists')) {
            await interaction.reply({
                content: `❌ A gif named "${gifName}" already exists for ${modelName}.\n\n` +
                         `Use \`/removeprofilegif\` to delete it first, or choose a different name.`,
                ephemeral: true
            });
        } else {
            await interaction.reply({
                content: `An error occurred: ${error.message}`,
                ephemeral: true
            });
        }
    }
}
