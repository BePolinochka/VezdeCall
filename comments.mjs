import {API, createCollectIterator, resolveResource} from 'vk-io';
import {argv} from "./utils.mjs";
import 'dotenv/config';

const apiLimit = 20,
    comments = new Map(),
    resource = argv('target'),
    api = new API({token: process.env.APP_TOKEN, apiLimit}),
    variants = argv('variants')?.toLowerCase()?.split(',').map(variant => new RegExp(variant.trim()));

const {type, id, ownerId: owner_id} = await resolveResource({api, resource})

if (!resource || !type || !id)
    console.error('Please specify valid URL or Resource ID by argument --target=vk.com/...') || process.exit()

if (!variants || !Array.isArray(variants) || !variants.length)
    console.error('Please specify valid variants by argument --variants=a,b,c,...]') || process.exit()

console.info('Selected target:', {type, id, owner_id})

console.info('Selected variants:', variants)

const results = {},
    iterator = createCollectIterator({
        params: {[`${type}_id`]: id, owner_id},
        method: `${type}.getComments`,
        api,
    });

for await (const chunk of iterator) chunk.items.forEach(item => comments.set(item.id, item))

console.info('Fetched comments:', comments.size)

const incVariant = (variant) => results[variant] = (results[variant] || 0) + 1

const searchVariants = comment => variants.forEach(variant =>
    ~comment.text.toLowerCase().search(variant) ? incVariant(variant) : undefined)

comments.forEach(searchVariants)

console.info('Results:', results)
