import {MongoClient} from 'mongodb';
import {API, Upload, Updates, getRandomId} from 'vk-io';

const mongo = await MongoClient.connect(process.env.MONGODB),
    users = mongo.db('Vezdekod').collection('Users'),
    api = new API({token: process.env.TOKEN, apiLimit: 20}),
    appAPI = new API({token: process.env.APP_TOKEN, apiLimit: 20});

export default new Updates({api, upload: new Upload({api})})
    .on('message_new', async context => {
        const {peerId} = context;
        switch (context.text.toLowerCase()) {
            case 'свободен': {
                const operator = await initUser({peerId}, {type: 'operator', status: 'free'})
                const customer = await getNextCustomer()
                if (customer) return await inviteUsersToCall(operator, customer)
                return await context.send('Ожидание новых пользователей...')
            }
            case 'звонок': {
                const customer = await initUser({peerId}, {type: 'customer', status: 'new'})
                const operator = await getFreeOperator()
                if (operator) return await inviteUsersToCall(operator, customer)
                return await context.send('Ожидание свободных операторов...')
            }
            default:
                return await context.send('Чтобы создать звонок, напишите Звонок, чтобы принять звонок напишите Свободен')
        }
    });

const createCallLink = () => appAPI.messages.startCall().then(({join_link} = {}) => join_link)

const incOperatorCalls = ({peerId} = {}) => users.updateOne({peerId}, {$inc: {calls: 1}})

const initUser = ({peerId} = {}, data = {}) =>
    users.updateOne({peerId}, {$set: data}, {upsert: true}).then(() => users.findOne({peerId}))

const getNextCustomer = (status = 'new') => users.findOne({type: 'customer', status})

const getFreeOperator = (status = 'free') => users.findOne({type: 'operator', status}, {sort: {calls: 1}})

const initOperatorCall = ({peerId} = {}) => users.findOne({peerId, call: {$exists: true}}).then(user => user?.call ||
    createCallLink().then(call => users.updateOne({peerId}, {$set: {call}}, {upsert: true}).then(() => call)))

const sendMessageToUser = ({peerId}, message) => api.messages.send({peer_id: peerId, message, random_id: getRandomId()})

const inviteUsersToCall = async (operator, customer) => {
    customer = await initUser(customer, {status: 'invited'})
    operator = await initUser(operator, {status: 'busy'})
    const call = await initOperatorCall(operator)
    await incOperatorCalls(operator)
    return await Promise.all([
        sendMessageToUser(operator, call),
        sendMessageToUser(customer, call)
    ])
}
