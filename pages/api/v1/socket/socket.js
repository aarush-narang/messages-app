import { Server } from 'socket.io'
import { QueryGroup, QueryUser, UpdateUser, UpdateGroup } from '../../../../lib/mongo'
import { apiHandler } from '../../../../lib/helpers/api-handler'
import { decodeJWT } from '../../../../lib/helpers/jwt-middleware'
import SnowflakeID from 'snowflake-id'
import { calculateFileSize } from '../../../components/util'

/*
    Events:
    - file uploads
    - messages
    - message edits
    - message deletes 
    - new groups (create modal first)

*/
// server side socket io
const ioHandler = (req, res) => {
    if (!res.socket.server.io) {
        const io = new Server(res.socket.server)
        const snowflake = new SnowflakeID({
            mid: 42,
            offset : Date.now()
        })


        // connection and messages here
        io.on('connection', socket => {
            socket.on('init-server', async (authToken, cb) => { // send initial data to client
                const user = decodeJWT(authToken)
                if (!user) return cb(null)
                else {
                    const dbuser = await QueryUser({ user: { token: user.token } })
                    if (!dbuser) return cb(null)
                    const objEntries = Object.entries(dbuser).filter(([key, value]) => ['username', 'email', 'uid', 'createdAt', 'refreshTokens', 'icon'].includes(key))
                    const userInfo = Object.fromEntries(objEntries)

                    const groups = [...dbuser.groups]

                    // subscribe to groups
                    for(const group of groups) {
                        try {
                            await socket.join((group.id))
                        } catch (error) {
                            console.log(`${user.username} failed to join group ${group.id}`)
                        }
                    }

                    const groupInfo = []
                    for (let i = 0; i < groups.length; i++) {
                        const group = await QueryGroup({ groupId: groups[i].id })
                        const filteredGroup = Object.entries(group).filter(([key, value]) => !['_id', 'messages'].includes(key))
                        groupInfo.push(Object.fromEntries(filteredGroup))
                    }
                    cb({ groups: groupInfo, user: userInfo })
                }
            })
            socket.on('currentGroupChange-server', async (data, cb) => { // when current group changes, send back messages data (non-stale)
                const token = data.accessToken
                const user = decodeJWT(token)
                if (!user) return cb(null)
                else {
                    const groupId = data.groupId
                    const group = await QueryGroup({ groupId })
                    if (group.members.includes(user.uid)) {
                        const curMsgsCt = group.messages.length
                        const messages = group.messages.slice((curMsgsCt - 20 < 0 ? 0 : curMsgsCt - 20), group.messages.length)
                        const authors = []

                        for (const message of messages) {
                            const findArr = authors.find(author => author.uid == message.author.uid)
                            if (findArr) {
                                message.author = findArr
                            }
                            else {
                                const dbuser = await QueryUser({ user: { uid: message.author } })
                                const objEntries = Object.entries(dbuser).filter(([key, value]) => ['username', 'uid', 'createdAt', 'icon'].includes(key))
                                const userInfo = Object.fromEntries(objEntries)

                                authors.push(userInfo)
                                message.author = userInfo
                            }
                        }
                        cb(messages)
                    } else {
                        cb(null)
                    }
                }

            })
            socket.on('loadMessages-server', async (data, cb) => {
                const token = data.accessToken
                const user = decodeJWT(token)
                if (!user) return cb(null)
                else {
                    const groupId = data.groupId
                    const group = await QueryGroup({ groupId })
                    if (group.members.includes(user.uid)) {
                        const len = group.messages.length
                        const ct = data.curMsgsCt
                        const MESSAGE_BATCH_SIZE = ct * 0.5
                        const messages = [...group.messages].slice(len - ct - (len - ct < MESSAGE_BATCH_SIZE ? len - ct : MESSAGE_BATCH_SIZE), len - ct)
                        if (messages.length == 0) return cb(null)
                        const authors = []

                        for (const message of messages) {
                            const findArr = authors.find(author => author.uid == message.author.uid)
                            if (findArr) {
                                message.author = findArr
                            }
                            else {
                                const dbuser = await QueryUser({ user: { uid: message.author } })
                                const objEntries = Object.entries(dbuser).filter(([key, value]) => ['username', 'uid', 'createdAt', 'icon'].includes(key))
                                const userInfo = Object.fromEntries(objEntries)

                                authors.push(userInfo)
                                message.author = userInfo
                            }
                        }
                        cb(messages)
                    } else {
                        cb(null)
                    }
                }
            })
            socket.on('updateGroupOrder-server', async (data) => { // when they change order of their groups, update the order in the database
                const token = data.accessToken
                const user = decodeJWT(token)
                if (!user) return
                else {
                    const newOrder = data.order

                    const dbUser = await QueryUser({ user: { token: user.token } })
                    const groups = dbUser.groups

                    // sort groups object by new order object
                    groups.sort((a, b) => {
                        const aIndex = newOrder.findIndex(item => Number(item.id) === a.id)
                        const bIndex = newOrder.findIndex(item => Number(item.id) === b.id)

                        a.order = aIndex
                        b.order = bIndex

                        return aIndex - bIndex
                    })

                    await UpdateUser({ user: { token: user.token }, newData: { groups } })
                }
            })

            // when any stalable data changes, in the corresponding socket event, send back new data and update client side
            // ex: when a group is joined, send back the new group data in the groupJoin event & update client side
            // message events
            socket.on('messageCreate-server', async (data) => {
                // when a message is sent, broadcast it to all users in the socket room and update the message in the database
                const token = data.accessToken
                const user = decodeJWT(token)
                if (!user) return
                else {
                    const groupId = data.groupId

                    const id = Number(snowflake.generate())
                    const author = user.uid
                    const message = data.message
                    const createdAt = Date.now()
                    const edited = false
                    const read = []

                    const newMessage = { id, author, message, createdAt, edited, read }
                    
                    const group = await QueryGroup({ groupId })
                    if(group) {
                        await UpdateGroup({ groupId, newData: { messages: group.messages.concat([newMessage]) } }).catch(err => console.log(err)) // add message to the end
                        io.in(groupId).emit('messageCreate-client', { message: newMessage, groupId }) // broadcast message to all users in the group
                    }

                    console.log(message.files[0].name || null)
                    console.log(calculateFileSize(message.files[0].data.toString('base64')))
                }
            })
            socket.on('messageEdit', () => {

            })
            socket.on('messageDelete', () => {

            })

            // group events
            socket.on('groupCreate', () => {

            })
            socket.on('groupEdit', () => {

            })
            socket.on('groupDelete', () => {

            })
            socket.on('groupJoin', () => {

            })
            socket.on('groupLeave', () => {

            })
        })



        res.socket.server.io = io
    } else {
        console.log('socket.io already running')
    }
    res.end()
}

export default apiHandler(ioHandler, ['jwt', 'csrf'])