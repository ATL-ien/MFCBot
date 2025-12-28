import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import * as db from '../databasefunctions.js';


// Command Builder export
export const data = new SlashCommandBuilder()
    .setName('listmodels')
    .setDescription('List watched models')
	.addChannelOption(option =>
		option.setName('channel')
			.setDescription('The channel posted to')
            .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);


// Execute function export
export async function execute(interaction) {
    const channel = interaction.options.getChannel('channel').id;
    const models = await db.getmodels();
    let modelnames = "";
    for (let index = 0; index < models.length; index++) {
        const element = models[index];
        if (element['channel'] == channel) {
            modelnames = modelnames + element['modelname'] + " : " + element['id'] + ", ";
        }
    }
    if (modelnames != "") {
        await interaction.reply({content: modelnames, ephemeral: true});
    } else {
        await interaction.reply({content: "No models are being watched", ephemeral: true});
    }
}