import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import * as profileDb from '../profilefunctions.js';
import { findProfile } from '../profilehelpers.js';

export const data = new SlashCommandBuilder()
    .setName('viewprofilegifs')
    .setDescription('View all gifs saved in a profile')
    .addStringOption(option =>
        option.setName('model')
            .setDescription('Profile name')
            .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

export async function execute(interaction) {
    const modelName = interaction.options.getString('model');
    
    try {
        await interaction.deferReply();
        
        // Find profile
        const result = await findProfile(modelName, false);
        
        if (!result) {
            await interaction.editReply({
                content: `❌ Profile "${modelName}" not found.`
            });
            return;
        }
        
        const { profile } = result;
        
        if (!profile.gifs || profile.gifs.length === 0) {
            await interaction.editReply({
                content: `📁 ${profile.model_name} has no gifs saved in their profile yet.\n\n` +
                         `Use \`/addprofilegif model:${modelName} name:wave url:...\` to add one!`
            });
            return;
        }
        
        // Sort gifs by name
        const sortedGifs = profile.gifs.sort((a, b) => a.name.localeCompare(b.name));
        
        // Build embed
        const embed = {
            title: `🎬 ${profile.model_name}'s Gifs Gallery`,
            description: `Total: ${sortedGifs.length} gif${sortedGifs.length !== 1 ? 's' : ''}`,
            color: 0x9b59b6,
            fields: [],
            footer: {
                text: `Use /showprofilegif to display a specific gif`
            }
        };
        
        // Add gifs to fields (max 25 fields per embed)
        for (const gif of sortedGifs.slice(0, 25)) {
            const addedDate = new Date(gif.added_at).toLocaleDateString();
            
            embed.fields.push({
                name: `🎥 ${gif.name}`,
                value: `[View Gif](${gif.url})\nAdded: ${addedDate}`,
                inline: true
            });
        }
        
        // Add note if more than 25 gifs
        if (sortedGifs.length > 25) {
            embed.description += `\n\n*Showing first 25 gifs*`;
        }
        
        await interaction.editReply({ embeds: [embed] });
        
    } catch (error) {
        console.error('Error viewing profile gifs:', error);
        
        if (interaction.deferred) {
            await interaction.editReply({
                content: `An error occurred: ${error.message}`
            });
        }
    }
}
