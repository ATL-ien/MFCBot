import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import * as db from '../databasefunctions.js';


// Command Builder export
export const data = new SlashCommandBuilder()
    .setName('updatemodel')
    .setDescription('Updates a model to watch on the server')
    .addStringOption(option =>
		option.setName('model')
			.setDescription('Model Name to watch')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('modelid')
            .setDescription('Model ID number')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('message')
            .setDescription('Message to announce')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('update')
            .setDescription('Time between updated topic announcements in minutes. Use 0 for no announcements. Must be more then 5')
            .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);


// Execute function export
export async function execute(interaction) {
    const modelid = interaction.options.getString('modelid');
    const model = interaction.options.getString('model');
    const message = interaction.options.getString('message');
    const channel = interaction.channelId;
    const update = interaction.options.getString('update');
    const server = interaction.guildId;
    const result = await db.updatemodel(modelid, model, message, channel, update, server);
    if (result['numAffected'] == 1) {
        await interaction.reply({content: "Model " + model + " was updated with the message: " + message, ephemeral: true});
    } else {
        await interaction.reply({content: "Model " + model + " was not updated", ephemeral: true});
    }
    //await interaction.reply(interaction.options.getChannel('channel'))
    
}