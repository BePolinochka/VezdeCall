import {API, createCollectIterator, VideoAttachment} from 'vk-io';
import {readFileSync, writeFileSync} from "fs";
import {setInterval} from 'timers/promises';
import {argv} from "./utils.mjs";
import 'dotenv/config';

const apiLimit = 20,
    apiVersion = '5.167',
    api = new API({token: process.env.APP_TOKEN, apiLimit, apiVersion});

const printVideoInConsole = ({id, owner_id} = {}) =>
    console.info('New video', `https://vk.com/${new VideoAttachment({payload: {id, owner_id}}).toString()}`)

const saveVideosHistory = (data = [], path = 'videos.json') => writeFileSync(path, JSON.stringify(data))

const loadVideosHistory = (path = 'videos.json') => {
    try {
        const data = JSON.parse(readFileSync(path).toString())
        return Array.isArray(data) ? data : []
    } catch (e) {
        console.info('No videos history found')
        return []
    }
}

const videos = loadVideosHistory(),
    owner_id = parseInt(argv('owner'));

if (!owner_id) console.error('Please specify owner id by argument --owner=...') || process.exit(0)

console.info('Target owner id:', owner_id)
console.info('Videos in history:', videos.length)

const fetchHandler = async () => {
    const iterator = createCollectIterator({
        params: {owner_id, live: true, adult: true, sort: 0},
        method: 'video.search',
        countPerRequest: 200,
        maxCount: 500,
        api,
    });

    for await (const chunk of iterator) {
        const newVideos = chunk.items.filter(({id} = {}) => !videos.includes(id))
        if (!newVideos.length) continue;
        newVideos.forEach(video => videos.push(video.id) && printVideoInConsole(video))
        saveVideosHistory(videos)
    }
}

await fetchHandler() // Initial run

for await (const interval of setInterval(60 * 1000)) await fetchHandler()
