import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import * as profileDb from '../profilefunctions.js';
import { findProfile } from '../profilehelpers.js';

export const data = new SlashCommandBuilder()
    .setName('addsocial')
    .setDescription('Add a social media link to a profile')
    .addStringOption(option =>
        option.setName('model')
            .setDescription('Profile name')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('platform')
            .setDescription('Social platform')
            .setRequired(true)
            .addChoices(
                { name: 'Twitter', value: 'twitter' },
                { name: 'Instagram', value: 'instagram' },
                { name: 'OnlyFans', value: 'onlyfans' },
                { name: 'Throne', value: 'throne' },
                { name: 'MFC Share', value: 'mfc_share' },
                { name: 'Amazon Wishlist', value: 'amazon' },
                { name: 'Pornhub', value: 'pornhub' },
                { name: 'ManyVids', value: 'manyvids' },
                { name: 'IMDb', value: 'imdb' },
                { name: 'Wikipedia', value: 'wikipedia' },
                { name: 'TikTok', value: 'tiktok' },
                { name: 'YouTube', value: 'youtube' },
                { name: 'Custom', value: 'custom' }
            ))
    .addStringOption(option =>
        option.setName('value')
            .setDescription('URL or handle')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('name')
            .setDescription('Platform name (required if platform is "Custom")')
            .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

export async function execute(interaction) {
    const modelName = interaction.options.getString('model');
    const platform = interaction.options.getString('platform');
    const value = interaction.options.getString('value');
    const customName = interaction.options.getString('name');
    
    try {
        // Validate custom platform
        if (platform === 'custom' && !customName) {
            await interaction.reply({
                content: '❌ You must provide a platform name when using "Custom".',
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
        
        // Add the social link
        const platformName = platform === 'custom' ? customName : platform;
        await profileDb.addSocial(identifier, platformName, value);
        
        const platformDisplayNames = {
            twitter: 'Twitter',
            instagram: 'Instagram',
            onlyfans: 'OnlyFans',
            throne: 'Throne',
            mfc_share: 'MFC Share',
            amazon: 'Amazon Wishlist',
            pornhub: 'Pornhub',
            manyvids: 'ManyVids',
            imdb: 'IMDb',
            wikipedia: 'Wikipedia',
            tiktok: 'TikTok',
            youtube: 'YouTube'
        };
        
        const displayName = platformDisplayNames[platform] || customName;
        
        await interaction.reply({
            content: `✅ Added **${displayName}** to ${profile.model_name}'s profile\n\n` +
                     `**${displayName}:** ${value}\n\n` +
                     `*Use \`/viewprofile model:${modelName}\` to see the full profile.*`,
            ephemeral: true
        });
        
        console.log(`Added ${displayName} for ${profile.model_name}: ${value}`);
        
    } catch (error) {
        console.error('Error adding social link:', error);
        await interaction.reply({
            content: `An error occurred: ${error.message}`,
            ephemeral: true
        });
    }
}
