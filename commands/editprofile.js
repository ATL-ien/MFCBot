import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import * as profileDb from '../profilefunctions.js';
import * as db from '../databasefunctions.js';

export const data = new SlashCommandBuilder()
    .setName('editprofile')
    .setDescription('Edit a profile field')
    .addStringOption(option =>
        option.setName('model')
            .setDescription('Profile name')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('field')
            .setDescription('Field to edit')
            .setRequired(true)
            .addChoices(
                { name: 'Birthday', value: 'birthday' },
                { name: 'Birthplace', value: 'birthplace' },
                { name: 'Location', value: 'location' },
                { name: 'Height', value: 'height' },
                { name: 'Measurements', value: 'measurements' },
                { name: 'Ethnicity', value: 'ethnicity' },
                { name: 'Years Active', value: 'years_active' },
                { name: 'Status', value: 'status' },
                { name: 'Category', value: 'category' },
                { name: 'Known For', value: 'known_for' },
                { name: 'Awards', value: 'awards' },
                { name: 'Notes', value: 'notes' }
            ))
    .addStringOption(option =>
        option.setName('value')
            .setDescription('New value for the field')
            .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

export async function execute(interaction) {
    const modelName = interaction.options.getString('model');
    const field = interaction.options.getString('field');
    const value = interaction.options.getString('value');
    
    try {
        // Try to find as custom profile first
        let profile = await profileDb.getProfile(modelName);
        
        // If not found as custom, try as tracked model
        if (!profile) {
            const models = await db.getmodels();
            const model = models.find(m => m.modelname.toLowerCase() === modelName.toLowerCase());
            
            if (model) {
                profile = await profileDb.getProfile(model.id);
                
                if (!profile) {
                    // Create profile for tracked model
                    profile = await profileDb.createProfile(model.id, model.modelname);
                }
            }
        }
        
        if (!profile) {
            await interaction.reply({
                content: `❌ Profile "${modelName}" not found.`,
                ephemeral: true
            });
            return;
        }
        
        // Update the field
        const identifier = profile.model_id || profile.custom_name;
        await profileDb.updateProfileField(identifier, field, value);
        
        const fieldNames = {
            birthday: 'Birthday',
            birthplace: 'Birthplace',
            location: 'Location',
            height: 'Height',
            measurements: 'Measurements',
            ethnicity: 'Ethnicity',
            years_active: 'Years Active',
            status: 'Status',
            category: 'Category',
            known_for: 'Known For',
            awards: 'Awards',
            notes: 'Notes'
        };
        
        await interaction.reply({
            content: `✅ Updated **${fieldNames[field]}** for ${profile.model_name}\n\n` +
                     `**${fieldNames[field]}:** ${value}\n\n` +
                     `*Use \`/viewprofile model:${modelName}\` to see the full profile.*`,
            ephemeral: true
        });
        
        console.log(`Updated ${field} for ${profile.model_name}: ${value}`);
        
    } catch (error) {
        console.error('Error editing profile:', error);
        await interaction.reply({
            content: `An error occurred: ${error.message}`,
            ephemeral: true
        });
    }
}
