import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import * as streamAlbumDb from '../streamalbumfunctions.js';

export const data = new SlashCommandBuilder()
    .setName('setstreamalbum')
    .setDescription('Set imgchest album URL for a model\'s stream gifs')
    .addStringOption(option =>
        option.setName('model')
            .setDescription('Model name (e.g., "Stacy")')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('url')
            .setDescription('Imgchest album URL')
            .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

export async function execute(interaction) {
    const modelName = interaction.options.getString('model');
    const albumUrl = interaction.options.getString('url');
    
    try {
        // Validate URL
        if (!albumUrl.includes('imgchest.com')) {
            await interaction.reply({
                content: '❌ Please provide a valid imgchest.com URL.',
                ephemeral: true
            });
            return;
        }
        
        // Save to database
        await streamAlbumDb.setStreamAlbum(modelName, albumUrl);
        
        await interaction.reply({
            content: `✅ Stream album set for **${modelName}**!\n\nURL: ${albumUrl}\n\nUse \`/streamgifs model:${modelName} date:MM/DD/YY\` to post gifs.`,
            ephemeral: true
        });
        
        console.log(`Set stream album for ${modelName}: ${albumUrl}`);
        
    } catch (error) {
        console.error('Error setting stream album:', error);
        await interaction.reply({
            content: 'An error occurred while setting the stream album.',
            ephemeral: true
        });
    }
}
