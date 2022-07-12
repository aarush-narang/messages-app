import { MongoClient } from 'mongodb'
import { createHash, randomBytes } from 'crypto'
import getConfig from 'next/config';
import SnowflakeID from 'snowflake-id'
import fs from 'fs'
import path from 'path'

const userSnowflake = new SnowflakeID({
    mid: 1,
    offset: Date.now(),
})
const PUBLIC_DIRECTORY = path.resolve('public')
const { serverRuntimeConfig } = getConfig()
const { mongoUri, pepper } = serverRuntimeConfig

// const client = new MongoClient(mongoUri, {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
// })

const client = new MongoClient('mongodb://localhost:27017', { // using localhost for now, much faster
    useNewUrlParser: true,
    useUnifiedTopology: true,
})

let connected = false
async function connect() {
    if (!client || !mongoUri) throw new Error('Client is unable to connect')
    if (connected) return client // if client is already connected, return client
    console.log('Connecting to MongoDB...')
    try {
        await client.connect() // otherwise, connect to client
        connected = true
    } catch (error) {
        console.log('MonogDB connection error: ' + error)
    }
}

function generateSalt() {
    return createHash('sha256').update(Math.random().toString()).digest('hex').slice(0, 10)
}
function generateToken() {
    return createHash('sha256').update(randomBytes(100)).digest('hex')
}
function generateSnowflake() {
    return parseInt(userSnowflake.generate())
}

export default client

export async function InsertUser({ user: { username, email, password } }) {
    try {
        await connect()
        if (!connected) throw new Error('Unable to connect to MongoDB')

        const imagePath = path.join(PUBLIC_DIRECTORY, 'images/defaultUser.png')
        const defaultUserIcon = fs.readFileSync(imagePath, { encoding: 'base64' })
        const db = client.db('MessagesApp')
        const users = db.collection('users')

        const salt = generateSalt()
        const passwordHash = createHash('sha256').update(password + salt + pepper).digest('hex')
        const token = generateToken()
        const uid = parseInt(generateSnowflake())
        await users.insertOne({
            username,
            email,
            password: passwordHash,
            salt,
            token,
            uid,
            createdAt: Date.now(),
            refreshTokens: [],
            groups: [],
            friends: {
                current: [],
                incoming: [],
                outgoing: [],
                blocked: [],
            },
            icon: `data:image/png;base64,${defaultUserIcon}`,
        })

        return await users.findOne({ uid })
    } catch (error) {
        console.log(error)
        return error
    }
}
export async function QueryUser({ user: { ...userQuery } }) {
    try {
        await connect() // connect to mongo
        if (!connected) throw new Error('Unable to connect to MongoDB')
        const db = client.db('MessagesApp')
        const users = db.collection('users')

        let user
        if (userQuery.email && userQuery.password) {
            user = await users.findOne({
                email: userQuery.email,
            })
            if (!user) return null

            const salt = user.salt
            const hash = createHash('sha256').update(userQuery.password + salt + pepper).digest('hex')

            if (hash === user.password) {
                return user
            }
        }
        else {
            user = await users.findOne({ ...userQuery })
            if (user) return user
        }

        return null
    } catch (error) {
        console.log(error)
        return error
    }
}
export async function UpdateUser({ user: { ...userFilter }, newData: { ...data } }) {
    try {
        await connect()
        if (!connected) throw new Error('Unable to connect to MongoDB')
        const db = client.db('MessagesApp')
        const users = db.collection('users')

        const user = await users.updateOne({
            ...userFilter
        }, {
            $set: {
                ...data
            }
        })

        return user
    } catch (error) {
        console.log(error)
        return error
    }
}
export async function DeleteUser({ user: { ...userFilter } }) {
    try {
        await connect()
        if (!connected) throw new Error('Unable to connect to MongoDB')
        const db = client.db('MessagesApp')
        const users = db.collection('users')

        await users.deleteOne({
            ...userFilter
        })

        return true
    } catch (error) {
        console.log(error)
        return error
    }
}

export async function InsertGroup({ group: { name, members, owner } }) {
    try {
        if(!name || !members) throw new Error('Group is missing required fields (name, members)')
        await connect()
        if (!connected) throw new Error('Unable to connect to MongoDB')

        const imagePath = path.join(PUBLIC_DIRECTORY, 'images/defaultGroup.png')
        const defaultGroupIcon = fs.readFileSync(imagePath, { encoding: 'base64' })
        const db = client.db('MessagesApp')
        const groups = db.collection('groups')

        const id = generateSnowflake()
        await groups.insertOne({
            name,
            members,
            messages: [],
            createdAt: Date.now(),
            id,
            icon: `data:image/png;base64,${defaultGroupIcon}`,
            owner: owner ? owner : members[0],
        })

        return await groups.findOne({ id })
    } catch (error) {
        console.log(error)
        return error
    }
}
export async function QueryGroup({ groupId }) {
    try {
        await connect() // connect to mongo
        if (!connected) throw new Error('Unable to connect to MongoDB')
        const db = client.db('MessagesApp')
        const groups = db.collection('groups')

        const group = await groups.findOne({ id: Number(groupId) })
        return group
    } catch (error) {
        console.log(error)
        return error
    }
}
export async function UpdateGroup({ groupId, newData: { ...data } }) {
    try {
        await connect()
        if (!connected) throw new Error('Unable to connect to MongoDB')
        const db = client.db('MessagesApp')
        const groups = db.collection('groups')

        await groups.updateOne({
            id: Number(groupId)
        }, {
            $set: {
                ...data
            }
        })

        return await groups.findOne({ id: Number(groupId) })
    } catch (error) {
        console.log(error)
        return error
    }
}
export async function DeleteGroup({ groupId }) {
    try {
        await connect()
        if (!connected) throw new Error('Unable to connect to MongoDB')
        const db = client.db('MessagesApp')
        const groups = db.collection('groups')

        await groups.deleteOne({
            id: Number(groupId)
        })

        return true
    } catch (error) {
        console.log(error)
        return error
    }
}