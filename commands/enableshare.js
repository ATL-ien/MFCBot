import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import * as shareDb from '../sharecontentfunctions.js';
import * as shareContent from '../sharecontent.js';
import * as db from '../databasefunctions.js';
import fetch from 'node-fetch';

export const data = new SlashCommandBuilder()
    .setName('enableshare')
    .setDescription('Enable MFC Share content monitoring for a model')
    .addStringOption(option =>
        option.setName('modelname')
            .setDescription('Model nickname (as stored in bot)')
            .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

export async function execute(interaction) {
    const modelName = interaction.options.getString('modelname');
    const channelId = interaction.channelId;
    
    try {
        // Find model in database
        const models = await db.getmodels();
        const model = models.find(m => m.modelname.toLowerCase() === modelName.toLowerCase());
        
        if (!model) {
            await interaction.reply({ 
                content: `❌ Model "${modelName}" not found. Use \`/listmodels\` to see tracked models.`, 
                ephemeral: true 
            });
            return;
        }
        
        // Get MFC username from API
        const url = `https://api-edge.myfreecams.com/recommend?model_id=${model.id}&version2=1&=`;
        const apiResponse = await fetch(url);
        const apiData = await apiResponse.json();
        
        let username = null;
        if (apiData.result && apiData.result.users && apiData.result.users[model.id]) {
            username = apiData.result.users[model.id].username;
        }
        
        if (!username) {
            await interaction.reply({ 
                content: `❌ Could not find MFC username for ${modelName}. Model may need to be online.`, 
                ephemeral: true 
            });
            return;
        }
        
        // Initialize content tracking
        await interaction.reply({ 
            content: `⏳ Initializing share monitoring for **${modelName}** (${username})...`, 
            ephemeral: true 
        });
        
        const currentContent = await shareContent.getShareContent(username);
        
        if (!currentContent) {
            await interaction.editReply({ 
                content: `❌ Could not access MFC Share page for ${username}. Username may be incorrect.`
            });
            return;
        }
        
        // Store initial state
        await shareDb.updateTrackedContent(model.id, username, 'albums', currentContent.albums);
        await shareDb.updateTrackedContent(model.id, username, 'clubs', currentContent.clubs);
        await shareDb.updateTrackedContent(model.id, username, 'videos', currentContent.videos);
        await shareDb.updateTrackedContent(model.id, username, 'goals', currentContent.goals);
        await shareDb.updateTrackedContent(model.id, username, 'items', currentContent.items);
        
        // Enable monitoring
        await shareDb.enableShareMonitoring(model.id, username, model.channel);
        
        let response = `✅ **Share monitoring enabled for ${modelName}!**\n\n`;
        response += `**Current content:**\n`;
        response += `📁 Albums: ${currentContent.albums.length}\n`;
        response += `🎥 Clubs: ${currentContent.clubs.length}\n`;
        response += `📹 Videos: ${currentContent.videos.length}\n`;
        response += `🎯 Goals: ${currentContent.goals.length}\n`;
        response += `🛍️ Items: ${currentContent.items.length}\n\n`;
        response += `New content will be announced in ${modelName}'s daily thread.`;
        
        await interaction.editReply({ content: response });
        console.log(`Share monitoring enabled for ${modelName} (${username}) in channel ${channelId}`);
        
    } catch (error) {
        console.error('Error enabling share monitoring:', error);
        
        // Only reply if we haven't already replied or deferred
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ 
                content: 'An error occurred while enabling share monitoring.', 
                ephemeral: true 
            });
        } else {
            await interaction.editReply({ 
                content: 'An error occurred while enabling share monitoring.'
            });
        }
    }
}
