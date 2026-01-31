import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import * as customShareDb from '../customsharefunctions.js';
import * as db from '../databasefunctions.js';

export const data = new SlashCommandBuilder()
    .setName('addshare')
    .setDescription('Add a custom share shortcut')
    .addStringOption(option =>
        option.setName('shortcut')
            .setDescription('Shortcut name (e.g., "beach", "red", "xmas")')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('type')
            .setDescription('Content type')
            .setRequired(true)
            .addChoices(
                { name: 'Album', value: 'albums' },
                { name: 'Club Show', value: 'clubs' },
                { name: 'Video', value: 'videos' },
                { name: 'Goal', value: 'goals' },
                { name: 'Item', value: 'items' },
                { name: 'Tip Menu', value: 'tipmenus' },
                { name: 'Poll', value: 'polls' }
            ))
    .addStringOption(option =>
        option.setName('id')
            .setDescription('Content ID from share link')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('model')
            .setDescription('Model name')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('title')
            .setDescription('Display title (optional)')
            .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

export async function execute(interaction) {
    const shortcut = interaction.options.getString('shortcut').toLowerCase();
    const contentType = interaction.options.getString('type');
    const contentId = interaction.options.getString('id');
    const modelName = interaction.options.getString('model');
    const title = interaction.options.getString('title');
    
    try {
        // Verify model exists
        const models = await db.getmodels();
        const model = models.find(m => m.modelname.toLowerCase() === modelName.toLowerCase());
        
        if (!model) {
            await interaction.reply({
                content: `❌ Model "${modelName}" not found in tracked models.`,
                ephemeral: true
            });
            return;
        }
        
        // Check if shortcut already exists
        const existingShortcut = await customShareDb.getCustomShare(modelName, shortcut);
        
        if (existingShortcut) {
            await interaction.reply({
                content: `❌ Shortcut "${shortcut}" already exists for ${modelName}.`,
                ephemeral: true
            });
            return;
        }
        
        // Add the shortcut using the correct function name
        await customShareDb.addCustomShare(
            modelName,
            model.id,
            shortcut,
            contentType,
            contentId,
            title
        );
        
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
        const shareUrl = baseUrls[contentType] + contentId;
        
        const typeNames = {
            albums: 'Album',
            clubs: 'Club Show',
            videos: 'Video',
            goals: 'Goal',
            items: 'Item',
            tipmenus: 'Tip Menu',
            polls: 'Poll'
        };
        
        await interaction.reply({
            content: `✅ **Share shortcut added!**\n\n` +
                     `**Shortcut:** \`${shortcut}\`\n` +
                     `**Type:** ${typeNames[contentType]}\n` +
                     (title ? `**Title:** ${title}\n` : '') +
                     `**Model:** ${modelName}\n` +
                     `**Link:** ${shareUrl}\n\n` +
                     `*Use it with \`/share shortcut:${shortcut}\`*`,
            ephemeral: true
        });
        
        console.log(`Added share shortcut: ${shortcut} (${contentType}) for ${modelName}`);
        
    } catch (error) {
        console.error('Error adding share shortcut:', error);
        await interaction.reply({
            content: `An error occurred: ${error.message}`,
            ephemeral: true
        });
    }
}
