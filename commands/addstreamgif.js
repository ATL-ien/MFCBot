import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import * as streamGifDb from '../streamgiffunctions.js';

export const data = new SlashCommandBuilder()
    .setName('addstreamgif')
    .setDescription('Add a stream gif for a model')
    .addStringOption(option =>
        option.setName('model')
            .setDescription('Model name (e.g., "Stacy")')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('date')
            .setDescription('Stream date (e.g., "1/1/26")')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('type')
            .setDescription('Outfit type')
            .setRequired(true)
            .addChoices(
                { name: 'Fit', value: 'Fit' },
                { name: 'Lingerie', value: 'Lingerie' },
                { name: 'Nude', value: 'Nude' },
                { name: 'Topless', value: 'Topless' },
                { name: 'Other', value: 'Other' }
            ))
    .addStringOption(option =>
        option.setName('url')
            .setDescription('Direct gif URL (e.g., https://cdn.imgchest.com/files/...)')
            .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

export async function execute(interaction) {
    const modelName = interaction.options.getString('model');
    const date = interaction.options.getString('date');
    const type = interaction.options.getString('type');
    const url = interaction.options.getString('url');
    
    try {
        // Validate URL
        if (!url.startsWith('http')) {
            await interaction.reply({
                content: '❌ Please provide a valid URL starting with http:// or https://',
                ephemeral: true
            });
            return;
        }
        
        // Add to database
        await streamGifDb.addStreamGif(modelName, date, type, url);
        
        await interaction.reply({
            content: `✅ Added stream gif!\n\n**Model:** ${modelName}\n**Date:** ${date}\n**Type:** ${type}\n\nUse \`/streamgifs model:${modelName} date:${date}\` to post all gifs for this date.`,
            ephemeral: true
        });
        
        console.log(`Added stream gif: ${modelName}/${date}/${type}`);
        
    } catch (error) {
        console.error('Error adding stream gif:', error);
        await interaction.reply({
            content: 'An error occurred while adding the stream gif.',
            ephemeral: true
        });
    }
}
