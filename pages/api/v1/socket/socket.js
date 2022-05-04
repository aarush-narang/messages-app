import { Server } from 'socket.io'
import { QueryGroup, QueryUser, UpdateUser } from '../../../../lib/mongo'
import { apiHandler } from '../../../../lib/helpers/api-handler'
import { decodeJWT } from '../../../../lib/helpers/jwt-middleware'


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



        // connection and messages here
        io.on('connection', socket => {
            socket.on('init', async (authToken, cb) => { // send initial data to client
                const user = decodeJWT(authToken)
                if (!user) return cb(null)
                else {
                    const dbuser = await QueryUser({ user: { token: user.token } })
                    if (!dbuser) return cb(null)
                    const objEntries = Object.entries(dbuser).filter(([key, value]) => ['username', 'email', 'uid', 'createdAt', 'refreshTokens', 'icon'].includes(key))
                    const userInfo = Object.fromEntries(objEntries)

                    const groups = [...dbuser.groups]

                    const groupInfo = []
                    for (let i = 0; i < groups.length; i++) {
                        const group = await QueryGroup({ groupId: groups[i].id })
                        const filteredGroup = Object.entries(group).filter(([key, value]) => !['_id'].includes(key))
                        groupInfo.push(Object.fromEntries(filteredGroup))
                    }
                    cb({ groups: groupInfo, user: userInfo })
                }
            })
            socket.on('currentGroupChange', async (data, cb) => { // when current group changes, send back messages data (non-stale)
                const token = data.accessToken
                const user = decodeJWT(token)
                if (!user) return cb(null)
                else {
                    const groupId = data.groupId
                    const group = await QueryGroup({ groupId })
                    if (group.members.includes(user.uid)) {
                        const messages = [...group.messages].slice(0, 50)
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
            socket.on('loadMessages', async (data, cb) => {
                const token = data.accessToken
                const user = decodeJWT(token)
                if (!user) return cb(null)
                else {
                    const groupId = data.groupId
                    const group = await QueryGroup({ groupId })
                    if (group.members.includes(user.uid)) {
                        const messages = [...group.messages].slice(data.curMsgs || 0, (data.curMsgs || 0) + 50)
                        if(messages.length == 0) return cb(null)
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
            socket.on('updateGroupOrder', async (data) => { // when they change order of their groups, update the order in the database
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
            socket.on('fileUpload', () => {

            })
            socket.on('messageCreate', () => {
                // when a message is sent, broadcast it to all users in the socket room and update the message in the database
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