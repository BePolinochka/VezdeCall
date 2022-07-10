import fetch from 'node-fetch';

const code = process.env.CODE;
const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const url = `https://oauth.vk.com/access_token?client_id=${client_id}&client_secret=${client_secret}&code=${code}`

export default async (req, res) => res.json(await fetch(url).then(r => r.json()))
