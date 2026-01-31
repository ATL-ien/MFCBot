import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import * as owedDb from '../owedfunctions.js';

export const data = new SlashCommandBuilder()
    .setName('addowed')
    .setDescription('Add an owed item to the tip bank')
    .addStringOption(option =>
        option.setName('username')
            .setDescription('MFC username of the tipper')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('description')
            .setDescription('What is owed (e.g., "pussy vid", "custom photoset")')
            .setRequired(true))
    .addUserOption(option =>
        option.setName('discord_user')
            .setDescription('Link to Discord user (optional)')
            .setRequired(false))
    .addStringOption(option =>
        option.setName('notes')
            .setDescription('Additional notes (e.g., "500tk tip on 1/5")')
            .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

export async function execute(interaction) {
    const username = interaction.options.getString('username');
    const description = interaction.options.getString('description');
    const discordUser = interaction.options.getUser('discord_user');
    const notes = interaction.options.getString('notes');
    
    try {
        const guildId = interaction.guildId;
        const discordUserId = discordUser ? discordUser.id : null;
        
        await owedDb.addOwed(guildId, username, discordUserId, description, notes);
        
        let response = `✅ Added to tip bank:\n`;
        response += `**Username:** ${username}\n`;
        response += `**Owed:** ${description}\n`;
        if (discordUser) {
            response += `**Discord:** ${discordUser.tag}\n`;
        }
        if (notes) {
            response += `**Notes:** ${notes}\n`;
        }
        response += `**Date:** ${new Date().toLocaleDateString('en-US')}`;
        
        await interaction.reply({ content: response, ephemeral: true });
    } catch (error) {
        console.error('Error adding owed item:', error);
        await interaction.reply({ 
            content: 'An error occurred while adding the owed item.', 
            ephemeral: true 
        });
    }
}
