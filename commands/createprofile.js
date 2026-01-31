import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import * as profileDb from '../profilefunctions.js';
import * as db from '../databasefunctions.js';

export const data = new SlashCommandBuilder()
    .setName('createprofile')
    .setDescription('Create a profile for a model')
    .addStringOption(option =>
        option.setName('model')
            .setDescription('Model name')
            .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

export async function execute(interaction) {
    const modelName = interaction.options.getString('model');
    
    try {
        // Get model from database
        const models = await db.getmodels();
        const model = models.find(m => m.modelname.toLowerCase() === modelName.toLowerCase());
        
        if (!model) {
            await interaction.reply({
                content: `❌ Model "${modelName}" not found in tracked models.\n\n` +
                         `Use \`/addmodel\` to start tracking this model first.`,
                ephemeral: true
            });
            return;
        }
        
        // Check if profile already exists
        let profile = await profileDb.getProfile(model.id);
        
        if (profile) {
            await interaction.reply({
                content: `⚠️ A profile already exists for ${model.modelname}.\n\n` +
                         `Use \`/viewprofile model:${model.modelname}\` to view it, or use \`/editprofile\` to update it.`,
                ephemeral: true
            });
            return;
        }
        
        // Create new profile
        profile = await profileDb.createProfile(model.id, model.modelname);
        
        await interaction.reply({
            content: `✅ **Profile created for ${model.modelname}!**\n\n` +
                     `The profile is empty right now. Use these commands to add information:\n\n` +
                     `📸 **Images:**\n` +
                     `\`/setprofileimage model:${model.modelname} slot:1 url:... description:Face\`\n` +
                     `\`/setprofileimage model:${model.modelname} slot:2 url:... description:Full Body\`\n\n` +
                     `👤 **Basic Info:**\n` +
                     `\`/editprofile model:${model.modelname} field:birthday value:12/3\`\n` +
                     `\`/editprofile model:${model.modelname} field:measurements value:34-24-36\`\n\n` +
                     `🔗 **Social Links:**\n` +
                     `\`/addsocial model:${model.modelname} platform:twitter value:@handle\`\n\n` +
                     `📝 **Notes:**\n` +
                     `\`/editprofile model:${model.modelname} field:notes value:Your notes here\`\n\n` +
                     `*View the profile anytime with \`/viewprofile model:${model.modelname}\`*`,
            ephemeral: true
        });
        
        console.log(`Created profile for ${model.modelname}`);
        
    } catch (error) {
        console.error('Error creating profile:', error);
        await interaction.reply({
            content: `An error occurred: ${error.message}`,
            ephemeral: true
        });
    }
}
