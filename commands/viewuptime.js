import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import * as uptimeLog from '../uptimelogfunctions.js';
import * as db from '../databasefunctions.js';

export const data = new SlashCommandBuilder()
    .setName('viewuptime')
    .setDescription('View uptime logs for a model')
    .addStringOption(option =>
        option.setName('model')
            .setDescription('Model name')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('date')
            .setDescription('Specific date (e.g., "1/1/2026")')
            .setRequired(false))
    .addStringOption(option =>
        option.setName('month')
            .setDescription('Month/Year (e.g., "1/2026")')
            .setRequired(false))
    .addStringOption(option =>
        option.setName('year')
            .setDescription('Year (e.g., "2026")')
            .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

export async function execute(interaction) {
    const modelName = interaction.options.getString('model');
    const date = interaction.options.getString('date');
    const month = interaction.options.getString('month');
    const year = interaction.options.getString('year');
    
    // Validate that at least one filter is provided
    if (!date && !month && !year) {
        await interaction.reply({
            content: '❌ Please provide at least one filter: date, month, or year.',
            ephemeral: true
        });
        return;
    }
    
    try {
        // Get model from database
        const models = await db.getmodels();
        const model = models.find(m => m.modelname.toLowerCase() === modelName.toLowerCase());
        
        if (!model) {
            await interaction.reply({
                content: `❌ Model "${modelName}" not found in tracked models.`,
                ephemeral: true
            });
            return;
        }
        
        let logs = [];
        let filterDescription = '';
        
        // Get logs based on filter
        if (date) {
            logs = await uptimeLog.getUptimeLogsByDate(model.modelname, date);
            filterDescription = `Date: ${date}`;
        } else if (month) {
            const [m, y] = month.split('/');
            logs = await uptimeLog.getUptimeLogsByMonth(model.modelname, parseInt(m), parseInt(y));
            filterDescription = `Month: ${month}`;
        } else if (year) {
            logs = await uptimeLog.getUptimeLogsByYear(model.modelname, parseInt(year));
            filterDescription = `Year: ${year}`;
        }
        
        if (logs.length === 0) {
            await interaction.reply({
                content: `No uptime logs found for **${model.modelname}** (${filterDescription}).`,
                ephemeral: true
            });
            return;
        }
        
        // Sort by date
        logs.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateA - dateB;
        });
        
        // Build response
        let response = `📊 **Uptime Logs for ${model.modelname}**\n`;
        response += `${filterDescription}\n\n`;
        
        // List each entry
        for (const log of logs) {
            response += `**${log.date}:** ${log.duration}`;
            if (log.note) {
                response += ` - _${log.note}_`;
            }
            response += '\n';
        }
        
        // Calculate and show total
        const totalDuration = uptimeLog.calculateTotalDuration(logs);
        response += `\n**Total:** ${totalDuration}`;
        response += `\n**Entries:** ${logs.length}`;
        
        // Split if too long
        if (response.length > 2000) {
            await interaction.reply({ content: response.substring(0, 1990) + '...', ephemeral: true });
            await interaction.followUp({ content: response.substring(1990), ephemeral: true });
        } else {
            await interaction.reply({ content: response, ephemeral: true });
        }
        
        console.log(`Viewed uptime logs: ${model.modelname} - ${filterDescription}`);
        
    } catch (error) {
        console.error('Error viewing uptime logs:', error);
        await interaction.reply({
            content: 'An error occurred while retrieving uptime logs.',
            ephemeral: true
        });
    }
}
