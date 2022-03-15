import { MongoClient } from 'mongodb'
import { createHash, randomBytes } from 'crypto'
import getConfig from 'next/config';
const { serverRuntimeConfig } = getConfig()
const { mongoUri, pepper } = serverRuntimeConfig

const client = new MongoClient(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
let connected = false
async function connect() {
    if (connected) return client // if client is already connected, return client
    console.log('Connecting to MongoDB...')
    connected = true
    return await client.connect() // otherwise, connect to client
}

function generateSalt() {
    return createHash('sha256').update(Math.random().toString()).digest('hex').slice(0, 10)
}
function generateToken() {
    return createHash('sha256').update(randomBytes(100)).digest('hex')
}

// password + salt + pepper = hash
export async function InsertUser(email, pwd) {
    try {
        await connect()
        const db = client.db('MessagesApp')
        const users = db.collection('users')

        const salt = generateSalt()
        const pwdHash = createHash('sha256').update(pwd + salt + pepper).digest('hex')
        const token = generateToken()
        const user = await users.insertOne({
            email,
            password: pwdHash,
            salt,
            token,
        })

        return user
    } catch (error) {
        return error
    }
}
export async function QueryUser({ email, pwd, token }) {
    try {
        await connect() // connect to mongo
        const db = client.db('MessagesApp')
        const users = db.collection('users')

        let user
        if (email && pwd) {
            user = await users.findOne({
                email,
            })
            if (!user) return null

            const salt = user.salt
            const hash = createHash('sha256').update(pwd + salt + pepper).digest('hex')

            if (hash === user.password) {
                return user
            }
        }
        else if (token) {
            user = await users.findOne({
                token,
            })
            if (user) return user
        }

        return null
    } catch (error) {
        return error
    }
}