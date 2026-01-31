import { SlashCommandBuilder } from 'discord.js';
import * as streamGifDb from '../streamgiffunctions.js';

export const data = new SlashCommandBuilder()
    .setName('poststreamgifs')
    .setDescription('Post stream gifs with filters (can post multiple)')
    .addStringOption(option =>
        option.setName('model')
            .setDescription('Filter by model name (optional)')
            .setRequired(false))
    .addStringOption(option =>
        option.setName('date')
            .setDescription('Filter by date (e.g., "1/1/26") (optional)')
            .setRequired(false))
    .addStringOption(option =>
        option.setName('type')
            .setDescription('Filter by outfit type (optional)')
            .setRequired(false)
            .addChoices(
                { name: 'Fit', value: 'Fit' },
                { name: 'Lingerie', value: 'Lingerie' },
                { name: 'Nude', value: 'Nude' },
                { name: 'Topless', value: 'Topless' },
                { name: 'Other', value: 'Other' }
            ));

export async function execute(interaction) {
    const modelFilter = interaction.options.getString('model');
    const dateFilter = interaction.options.getString('date');
    const typeFilter = interaction.options.getString('type');
    
    // At least one filter required
    if (!modelFilter && !dateFilter && !typeFilter) {
        await interaction.reply({
            content: '❌ Please provide at least one filter (model, date, or type).',
            ephemeral: true
        });
        return;
    }
    
    try {
        let gifs;
        let filterDescription = '';
        
        // Apply filters
        if (modelFilter && dateFilter) {
            // Both model and date
            gifs = await streamGifDb.getStreamGifs(modelFilter, dateFilter);
            filterDescription = `${modelFilter} - ${dateFilter}`;
        } else if (modelFilter) {
            // Model only
            gifs = await streamGifDb.getStreamGifsByModel(modelFilter);
            filterDescription = modelFilter;
        } else if (typeFilter) {
            // Type only
            gifs = await streamGifDb.getStreamGifsByType(typeFilter);
            filterDescription = `${typeFilter} outfits`;
        } else {
            // Get all, will filter by date/type below
            const allModels = await streamGifDb.getModelsWithStreamGifs();
            let allGifs = [];
            for (const model of allModels) {
                const modelGifs = await streamGifDb.getStreamGifsByModel(model);
                allGifs = allGifs.concat(modelGifs);
            }
            gifs = allGifs;
            filterDescription = 'All models';
        }
        
        // Apply additional filters
        if (typeFilter) {
            gifs = gifs.filter(g => g.type === typeFilter);
            if (!filterDescription.includes(typeFilter)) {
                filterDescription += ` - ${typeFilter}`;
            }
        }
        
        if (dateFilter && !modelFilter) {
            gifs = gifs.filter(g => g.date === dateFilter);
            if (!filterDescription.includes(dateFilter)) {
                filterDescription = dateFilter + (filterDescription ? ` - ${filterDescription}` : '');
            }
        }
        
        if (gifs.length === 0) {
            await interaction.reply({
                content: `❌ No stream gifs found matching your filters.`,
                ephemeral: true
            });
            return;
        }
        
        // Sort by model, date, then type
        gifs.sort((a, b) => {
            if (a.model_name !== b.model_name) {
                return a.model_name.localeCompare(b.model_name);
            }
            if (a.date !== b.date) {
                return a.date.localeCompare(b.date);
            }
            const typeOrder = { 'Fit': 1, 'Lingerie': 2, 'Topless': 3, 'Nude': 4, 'Other': 5 };
            return (typeOrder[a.type] || 99) - (typeOrder[b.type] || 99);
        });
        
        // Confirm with user
        await interaction.reply({
            content: `📸 **Posting ${gifs.length} stream gif${gifs.length > 1 ? 's' : ''}**\n*${filterDescription}*`
        });
        
        // Post each gif as a separate embed
        for (const gif of gifs) {
            const embed = {
                title: `${gif.type}`,
                url: gif.url,
                image: {
                    url: gif.url
                },
                color: 0xe91e63,  // Pink color
                footer: {
                    text: `${gif.model_name} • ${gif.date}`
                }
            };
            
            await interaction.followUp({ embeds: [embed] });
            
            // Small delay to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        console.log(`Posted ${gifs.length} stream gifs with filters: model=${modelFilter}, date=${dateFilter}, type=${typeFilter}`);
        
    } catch (error) {
        console.error('Error posting stream gifs:', error);
        
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
                content: 'An error occurred while posting stream gifs.',
                ephemeral: true
            });
        } else {
            await interaction.reply({
                content: 'An error occurred while posting stream gifs.',
                ephemeral: true
            });
        }
    }
}
