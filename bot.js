import { Client, Events, GatewayIntentBits, SlashCommandRoleOption } from 'discord.js';
import { config } from 'dotenv';
import * as addmodel from './commands/addmodel.js';
import * as updatemodel from './commands/updatemodel.js';
import * as removemodel from './commands/removemodel.js';
import * as dbfunctions from './databasefunctions.js';
import * as getmodelid from './commands/getmodelid.js';
import * as webstuff from './webstuff.js';
import * as listmodels from './commands/listmodels.js';
import * as intervaldatabase from './intervaldatabase.js';

config();

// Create a new client instance
const client = new Client({
    intents: [GatewayIntentBits.Guilds],
});

async function handleInteraction(interaction) {
    if (!interaction.isCommand()) return;
    if (interaction.commandName === 'addmodel') {
        await addmodel.execute(interaction);
    } else if (interaction.commandName === "updatemodel") {
        await updatemodel.execute(interaction);
    } else if (interaction.commandName === "removemodel") {
        await removemodel.execute(interaction);
        await removeinterval(interaction.options.getString('modelid'), interaction.options.getChannel('channel').id);
    } else if (interaction.commandName === "getmodelid") {
        await getmodelid.execute(interaction);
    } else if (interaction.commandName === "listmodels") {
        await listmodels.execute(interaction);
    }
}

async function getmodels() {
    return await dbfunctions.getmodels();
}

async function sendmessage(channelid, message) {
    //console.log(message);
    var channel = client.channels.cache.get(channelid);
    await channel.send(message);

}

// When the client is ready, run this code (only once)
client.once(Events.ClientReady, readyDiscord);

// Login to Discord with your client's token
client.login(process.env.TOKEN);

async function readyDiscord() {
    console.log('💖');
    const models = await getmodels();
    for (let index = 0; index < models.length; index++) {
        const element = models[index];
        await dbfunctions.updatetopic(element['id'], false, element['channel']);
    }
    onlinecheck();
    setInterval(onlinecheck, 120000);
}

client.on(Events.InteractionCreate, handleInteraction);

async function onlinecheck() {
    //console.log("Online")
    const models = await getmodels();
    for (let index = 0; index < models.length; index++) {
        const element = models[index];
        const currenttopic = await webstuff.gettopic(element['id']);
        if (!currenttopic && element['topic'] != false) {
            const channel = client.channels.cache.get(element['channel']);
            const ts = Date.now() - element['time'];
            var time = new Date(ts);
            const message = element['modelname'] + " has gone offline. She was online for " + time.getUTCHours() + " hours " + time.getUTCMinutes() + " minutes and " + time.getUTCSeconds() + " seconds";
            await channel.send(message);
            await dbfunctions.updatetime(element['id'], false, element['channel']);
            await dbfunctions.updatetopic(element['id'], false, element['channel']);
        } else if (currenttopic && element['topic'] == false) {
            const channel = client.channels.cache.get(element['channel']);
            const message = element['message'] + "\nCurrent topic is:\n" + currenttopic;
            //await channel.send(element['message']);
            //await channel.send("Current topic is:");
            //await channel.send(currenttopic);
            await channel.send(message);
            await dbfunctions.updatetopic(element['id'], currenttopic, element['channel']);
            const time = Date.now();
            await dbfunctions.updatetime(element['id'], time, element['channel']);
            if (Number(element['update']) > 5) {
                const time = Number(element['update']) * 60 * 1000
                //console.log(time);
                const interval = setInterval(topicchange, time, element['id'], element['channel']);
                const intervalId = interval[Symbol.toPrimitive]();
                //console.log(intervalId);
                await intervaldatabase.addinterval(element['id'], element['channel'], intervalId);
            }
        } else if (!currenttopic && element['time'] != false) {
            const channel = client.channels.cache.get(element['channel']);
            const ts = Date.now() - element['time'];
            var time = new Date(ts);
            const message = element['modelname'] + " has gone offline while the bot was offline.";
            await channel.send(message);
            await dbfunctions.updatetime(element['id'], false, element['channel']);
            await dbfunctions.updatetopic(element['id'], false), element['channel'];
        }
    }
}

async function topicchange(modelid, channel) {
    //console.log("Topic");
    //const interval = await intervaldatabase.getinterval(modelid, channel);
    //console.log(interval);
    const model = await dbfunctions.getmodel(modelid, channel);
    const currenttopic = await webstuff.gettopic(modelid);
    try {
        if (model[0]['update'] === false) {
            clearInterval(this)
        } else if (!currenttopic) {
            clearInterval(this);
        } else if (currenttopic != model[0]['topic']) {
            const channel = client.channels.cache.get(model[0]['channel']);
            await channel.send("New topic for " + model[0]['modelname'] + "\n" + currenttopic);
            //await channel.send(currenttopic);
            dbfunctions.updatetopic(modelid, currenttopic, channel);
        }   
    } catch (error) {
        clearInterval(this);
        console.log("Change fail " + modelid + ", " + channel);
    }
}

async function removeinterval(modelid, channel) {
    const interval = await intervaldatabase.getinterval(modelid, channel);
    clearInterval(interval);
    await intervaldatabase.deleteinterval(modelid, channel);
}





//clearInterval(this);