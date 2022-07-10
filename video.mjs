import {API, createCollectIterator} from 'vk-io';
import videoshow from 'videoshow';
import {argv} from "./utils.mjs";
import {writeFileSync, mkdirSync} from "fs";
import download from 'download';
import 'dotenv/config';

const loop = 5,
    videos = [],
    apiLimit = 20,
    apiVersion = '5.167',
    imagesDir = 'images/',
    videoPath = 'video.mp4',
    owner_id = parseInt(argv('owner')),
    maxCount = parseInt(argv('limit')) || 500,
    api = new API({token: process.env.APP_TOKEN, apiLimit, apiVersion}),
    iterator = createCollectIterator({
        params: {owner_id, sort: 3},
        method: `video.search`,
        maxCount,
        api,
    });

if (!owner_id) console.error('Please specify owner id by argument --owner=...') || process.exit(0)

console.info('Videos count limited to:', maxCount)

for await (const chunk of iterator) chunk.items.forEach(item => videos.push(item))

console.info('Loaded videos:', videos.length)

mkdirSync(imagesDir, {recursive: true})

console.info('Downloading images to:', imagesDir)

const images = await Promise.all(videos.map(({title: caption, image}, i) => download(image.pop()?.url)
    .then((image, path = `${imagesDir}${i}.jpg`) => writeFileSync(path, image) || {path, caption})))

console.info('Images download complete')

videoshow(images, {loop}).save(videoPath)
    .on('start', command => console.log('ffmpeg process started:', command))
    .on('error', (err, stdout, stderr) => console.error('Error:', err) || console.error('ffmpeg stderr:', stderr))
    .on('end', output => console.info('Video created in:', output))
