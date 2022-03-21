import { MongoClient } from 'mongodb'
import { createHash, randomBytes } from 'crypto'
import getConfig from 'next/config';
import { stdout } from 'process';
const { serverRuntimeConfig } = getConfig()
const { mongoUri, pepper } = serverRuntimeConfig

const client = new MongoClient(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
let connected = false
async function connect() {
    if (connected) return client // if client is already connected, return client
    stdout.write('Connecting to MongoDB...\n')
    connected = true
    try {
        await client.connect() // otherwise, connect to client
    } catch (error) {
        stdout.write('MonogDB connection error: ' + error + '\n')
    } 
}

function generateSalt() {
    return createHash('sha256').update(Math.random().toString()).digest('hex').slice(0, 10)
}
function generateToken() {
    return createHash('sha256').update(randomBytes(100)).digest('hex')
}

// password + salt + pepper = hash
export async function InsertUser(email, password) {
    try {
        await connect()
        const db = client.db('MessagesApp')
        const users = db.collection('users')

        const salt = generateSalt()
        const passwordHash = createHash('sha256').update(password + salt + pepper).digest('hex')
        const token = generateToken()
        const user = await users.insertOne({
            email,
            password: passwordHash,
            salt,
            token,
        })

        return user
    } catch (error) {
        return error
    }
}

export async function QueryUser({ user: { ...userQuery } }) {
    try {
        await connect() // connect to mongo
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
        return error
    }
}

export async function UpdateUser({ user: { ...userFilter }, newData: { ...data } }) {
    try {
        await connect()
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
        return error
    }
}