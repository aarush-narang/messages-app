import { Server } from 'socket.io'
import { QueryGroup, QueryUser, UpdateUser, UpdateGroup } from '../../../../lib/mongo'
import { apiHandler } from '../../../../lib/helpers/api-handler'
import { decodeJWT } from '../../../../lib/helpers/jwt-middleware'
import SnowflakeID from 'snowflake-id'

const MAX_BUFFER_SIZE = 50 // max message size in mb
const authors = [] // keep in memory for less db calls
const MAX_PENDING_FRIEND_REQUESTS = 100
const MAX_OUTGOING_FRIEND_REQUESTS = MAX_PENDING_FRIEND_REQUESTS
/*
    Events:
    - file uploads
    - messages
    - message edits
    - message deletes 
    - new groups (create modal first)

*/
async function fetchUserObjectWithUserID(uid) {
    const dbuser = await QueryUser({ user: { uid } })
    const objEntries = Object.entries(dbuser).filter(([key, value]) => ['username', 'uid', 'createdAt', 'icon'].includes(key))
    const userInfo = Object.fromEntries(objEntries)
    return userInfo
}
async function replaceMessagesAuthorId(messages = []) {
    const copy = [...messages]
    for (const message of copy) {
        const findArr = authors.find(author => author.uid == message.author)
        if (findArr) {
            message.author = findArr
        }
        else {
            const userInfo = await fetchUserObjectWithUserID(message.author)

            authors.push(userInfo)
            message.author = userInfo
        }
    }
    return copy
}
async function replaceFriendRequestIDsWithObject(requests = []) {
    const copy = [...requests]
    const res = []
    for (let id of copy) {
        const findArr = authors.find(author => author.uid == id)
        if (findArr) {
            res.push(findArr)
        }
        else {
            const userInfo = await fetchUserObjectWithUserID(id)

            authors.push(userInfo)
            res.push(userInfo)
        }
    }
    return res
}
const ioHandler = (req, res) => {
    if (!res.socket.server.io) {
        const io = new Server(res.socket.server, {
            maxHttpBufferSize: MAX_BUFFER_SIZE * 1024 * 1024,
            pingTimeout: 60000,
            httpCompression: true,
        })
        const messageSnowflake = new SnowflakeID({
            mid: 2,
            offset: Date.now()
        })

        // connection and messages here
        io.on('connection', socket => {
            socket.on('init-server', async (authToken, cb) => { // send initial data to client
                try {
                    const user = decodeJWT(authToken)
                    if (!user) return cb(null)
                    else {
                        const dbuser = await QueryUser({ user: { token: user.token } })
                        if (!dbuser) return cb(null)
                        const objEntries = Object.entries(dbuser).filter(([key, value]) => ['username', 'email', 'uid', 'createdAt', 'refreshTokens', 'icon', 'friends'].includes(key))
                        const userInfo = Object.fromEntries(objEntries)

                        const groups = [...dbuser.groups]

                        // connect socket to groups
                        for (const group of groups) {
                            try {
                                await socket.join([group.id, user.uid])
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

                        // replace friend request user ids with user objects
                        const current = await replaceFriendRequestIDsWithObject(dbuser.friends.current)
                        const pending = await replaceFriendRequestIDsWithObject(dbuser.friends.pending)
                        const outgoing = await replaceFriendRequestIDsWithObject(dbuser.friends.outgoing)

                        userInfo.friends = {
                            current,
                            pending,
                            outgoing
                        }

                        cb({ groups: groupInfo, user: userInfo })
                    }
                } catch (error) {
                    console.log(error)
                    cb(null)
                }
            })
            socket.on('currentGroupChange-server', async (data, cb) => { // when current group changes, send back messages data (non-stale)
                try {
                    const token = data.accessToken
                    const user = decodeJWT(token)
                    if (!user) return cb(null)
                    else {
                        const groupId = data.groupId
                        const group = await QueryGroup({ groupId })
                        if (group.members.includes(parseInt(user.uid))) {
                            const curMsgsCt = group.messages.length
                            const messages = group.messages.slice((curMsgsCt - 20 < 0 ? 0 : curMsgsCt - 20), group.messages.length)

                            const messagesWithAuthor = await replaceMessagesAuthorId(messages)

                            cb(messagesWithAuthor)
                        } else {
                            cb(null)
                        }
                    }
                } catch (error) {
                    console.log(error)
                    cb(null)
                }
            })
            socket.on('loadMessages-server', async (data, cb) => {
                try {
                    const token = data.accessToken
                    const user = decodeJWT(token)
                    if (!user) return cb(null)
                    else {
                        const groupId = data.groupId
                        const group = await QueryGroup({ groupId })
                        if (group.members.includes(parseInt(user.uid))) {
                            const len = group.messages.length
                            const ct = data.curMsgsCt
                            if (len - ct <= 0) return cb(null)

                            const MESSAGE_BATCH_SIZE = ct * 0.5
                            const messages = [...group.messages].slice(len - ct - (len - ct < MESSAGE_BATCH_SIZE ? len - ct : MESSAGE_BATCH_SIZE), len - ct)
                            if (messages.length == 0) return cb(null)

                            const messagesWithAuthor = await replaceMessagesAuthorId(messages)

                            cb(messagesWithAuthor)
                        } else {
                            cb(null)
                        }
                    }
                } catch (error) {
                    console.log(error)
                    cb(null)
                }

            })
            socket.on('updateGroupOrder-server', async (data) => { // when they change order of their groups, update the order in the database
                try {
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
                } catch (error) {
                    console.log(error)
                }

            })

            // when any stalable data changes, in the corresponding socket event, send back new data and update client side
            // ex: when a group is joined, send back the new group data in the groupJoin event & update client side
            // message events
            socket.on('messageCreate-server', async (data) => {
                try {
                    const token = data.accessToken
                    const user = decodeJWT(token)
                    if (!user) return
                    else {
                        const groupId = data.groupId

                        const id = Number(messageSnowflake.generate())
                        const author = user.uid
                        const message = data.message
                        const createdAt = Date.now()
                        const edited = false
                        const read = []

                        const messageObj = { id, author, message, createdAt, edited, read }
                        const newMessage = await replaceMessagesAuthorId([{ id, author, message, createdAt, edited, read }]).then(messages => messages[0])

                        const group = await QueryGroup({ groupId })
                        if (group) {
                            await UpdateGroup({ groupId, newData: { messages: group.messages.concat([messageObj]) } }).catch(err => console.log(err)) // add message to the end
                            io.in(groupId).emit('messageCreate-client', { message: newMessage, groupId }) // broadcast message to all users in the group
                        }
                    }
                } catch (error) {
                    console.log(error)
                }

            })
            socket.on('messageDelete-server', async (data, cb) => {
                try {
                    const token = data.accessToken
                    const user = decodeJWT(token)
                    if (!user) return cb(null)
                    else {
                        const groupId = data.groupId
                        const messageId = data.messageId

                        const group = await QueryGroup({ groupId })
                        if (group) {
                            const messages = group.messages
                            const newMessages = messages.filter(message => message.id != messageId)
                            if (newMessages.length == messages.length) return cb(true) // if message doesn't exist, return true because it's already deleted

                            await UpdateGroup({ groupId, newData: { messages: newMessages } })
                            io.in(groupId).emit('messageDelete-client', { messageId, groupId })
                            cb(true)
                        }
                        else {
                            cb(false)
                        }
                    }
                } catch (error) {
                    console.log(error)
                    cb(false)
                }
            })
            socket.on('messageEdit-server', async (data, cb) => {
                try {
                    const token = data.accessToken
                    const user = decodeJWT(token)
                    if (!user) return cb(null)
                    else {
                        const groupId = data.groupId
                        const messageId = data.messageId
                        const newMessage = data.newMessage

                        const group = await QueryGroup({ groupId })
                        if (group) {
                            const messages = group.messages
                            const newMessages = messages.map(message => {
                                if (message.id == messageId) {
                                    message.message.content = newMessage
                                    message.edited = true
                                }
                                return message
                            })
                            await UpdateGroup({ groupId, newData: { messages: newMessages } })
                            io.in(groupId).emit('messageEdit-client', { messageId, newMessage, groupId })
                            cb(true)
                        } else {
                            return cb(null)
                        }
                    }
                } catch (error) {
                    console.log(error)
                }
            })

            // friend events
            socket.on('friendRequest-server', async (data, cb) => {
                try {
                    const token = data.accessToken
                    const user = decodeJWT(token)
                    if (!user) return cb(null)
                    else {
                        const friendUser = data.friend
                        const friend = await QueryUser({ user: friendUser })
                        const sender = await QueryUser({ user: { token: user.token } })

                        if (friend) {
                            if (sender.friends.outgoing.includes(friend.uid)) {
                                cb({ error: `You already have a request outgoing with @${friend.username}!` })
                            } else if (sender.friends.current.includes(friend.uid)) {
                                cb({ error: `You are already friends with @${friend.username}!` })
                            } else if (sender.friends.pending.includes(friend.uid)) {
                                const newDataSender = {
                                    current: sender.friends.current.concat([friend.uid]),
                                    outgoing: sender.friends.outgoing.filter(uid => uid != friend.uid),
                                    pending: sender.friends.pending.filter(uid => uid != friend.uid)
                                }
                                const newDataFriend = {
                                    current: friend.friends.current.concat([sender.uid]),
                                    outgoing: friend.friends.outgoing.filter(uid => uid != sender.uid),
                                    pending: friend.friends.pending.filter(uid => uid != sender.uid)
                                }

                                await UpdateUser({ user: { token: sender.token }, newData: { friends: newDataSender } })
                                await UpdateUser({ user: { token: friend.token }, newData: { friends: newDataFriend } })

                                const newDataSenderObject = {
                                    current: await replaceFriendRequestIDsWithObject(newDataSender.current),
                                    outgoing: await replaceFriendRequestIDsWithObject(newDataSender.outgoing),
                                    pending: await replaceFriendRequestIDsWithObject(newDataSender.pending)
                                }
                                const newDataFriendObject = {
                                    current: await replaceFriendRequestIDsWithObject(newDataFriend.current),
                                    outgoing: await replaceFriendRequestIDsWithObject(newDataFriend.outgoing),
                                    pending: await replaceFriendRequestIDsWithObject(newDataFriend.pending)
                                }

                                io.in(sender.uid).emit('friendRequest-client', { data: newDataSenderObject })
                                io.in(friend.uid).emit('friendRequest-client', { data: newDataFriendObject })

                                cb({ success: `You are now friends with @${friend.username}!` })
                            } else if (friend.friends.pending.length > MAX_PENDING_FRIEND_REQUESTS) {
                                cb({ error: `@${friend.username} has too many pending friend requests` })
                            } else if (sender.friends.outgoing.length > MAX_OUTGOING_FRIEND_REQUESTS) {
                                cb({ error: `You have too many outgoing friend requests.` })
                            } else {
                                const newDataSender = {
                                    current: sender.friends.current,
                                    outgoing: sender.friends.outgoing.concat([friend.uid]),
                                    pending: sender.friends.pending
                                }
                                const newDataFriend = {
                                    current: friend.friends.current,
                                    outgoing: friend.friends.outgoing,
                                    pending: friend.friends.pending.concat([sender.uid])
                                }

                                await UpdateUser({ user: { token: sender.token }, newData: { friends: newDataSender } })
                                await UpdateUser({ user: { token: friend.token }, newData: { friends: newDataFriend } })

                                const newDataSenderObject = {
                                    current: await replaceFriendRequestIDsWithObject(newDataSender.current),
                                    outgoing: await replaceFriendRequestIDsWithObject(newDataSender.outgoing),
                                    pending: await replaceFriendRequestIDsWithObject(newDataSender.pending)
                                }
                                const newDataFriendObject = {
                                    current: await replaceFriendRequestIDsWithObject(newDataFriend.current),
                                    outgoing: await replaceFriendRequestIDsWithObject(newDataFriend.outgoing),
                                    pending: await replaceFriendRequestIDsWithObject(newDataFriend.pending)
                                }

                                io.in(sender.uid).emit('friendRequest-client', { data: newDataSenderObject })
                                io.in(friend.uid).emit('friendRequest-client', { data: newDataFriendObject })

                                cb({ success: `Friend request sent to @${friend.username}!` })
                            }
                        } else {
                            cb({ error: 'User does not exist.' })
                        }
                    }
                } catch (error) {
                    console.log(error)
                    cb({ error: 'Oops! There was an error. Try again later.' })
                }
            })
            socket.on('friendRequestManage-server', async (data, cb) => {
                try {
                    const token = data.accessToken
                    const user = decodeJWT(token)
                    if (!user) return cb(null)
                    else {
                        const friendUser = data.friend
                        const friend = await QueryUser({ user: friendUser })
                        const sender = await QueryUser({ user: { token: user.token } })

                        const status = data.status

                        if (status.state == 'pending' && status.action == 'accept') {
                            const newDataSender = {
                                current: sender.friends.current.concat([friend.uid]),
                                outgoing: sender.friends.outgoing.filter(uid => uid != friend.uid),
                                pending: sender.friends.pending.filter(uid => uid != friend.uid)
                            }
                            const newDataFriend = {
                                current: friend.friends.current.concat([sender.uid]),
                                outgoing: friend.friends.outgoing.filter(uid => uid != sender.uid),
                                pending: friend.friends.pending.filter(uid => uid != sender.uid)
                            }

                            await UpdateUser({ user: { token: sender.token }, newData: { friends: newDataSender } })
                            await UpdateUser({ user: { token: friend.token }, newData: { friends: newDataFriend } })

                            const newDataSenderObject = {
                                current: await replaceFriendRequestIDsWithObject(newDataSender.current),
                                outgoing: await replaceFriendRequestIDsWithObject(newDataSender.outgoing),
                                pending: await replaceFriendRequestIDsWithObject(newDataSender.pending)
                            }
                            const newDataFriendObject = {
                                current: await replaceFriendRequestIDsWithObject(newDataFriend.current),
                                outgoing: await replaceFriendRequestIDsWithObject(newDataFriend.outgoing),
                                pending: await replaceFriendRequestIDsWithObject(newDataFriend.pending)
                            }

                            io.in(sender.uid).emit('friendRequest-client', { data: newDataSenderObject })
                            io.in(friend.uid).emit('friendRequest-client', { data: newDataFriendObject })
                        } else if ((status.state == 'pending' && status.action == 'decline') || (status.state == 'outgoing' && status.action == 'cancel')) {
                            const newDataSender = {
                                current: sender.friends.current,
                                outgoing: sender.friends.outgoing.filter(uid => uid != friend.uid),
                                pending: sender.friends.pending.filter(uid => uid != friend.uid)
                            }
                            const newDataFriend = {
                                current: friend.friends.current,
                                outgoing: friend.friends.outgoing.filter(uid => uid != sender.uid),
                                pending: friend.friends.pending.filter(uid => uid != sender.uid)
                            }

                            await UpdateUser({ user: { token: sender.token }, newData: { friends: newDataSender } })
                            await UpdateUser({ user: { token: friend.token }, newData: { friends: newDataFriend } })

                            const newDataSenderObject = {
                                current: await replaceFriendRequestIDsWithObject(newDataSender.current),
                                outgoing: await replaceFriendRequestIDsWithObject(newDataSender.outgoing),
                                pending: await replaceFriendRequestIDsWithObject(newDataSender.pending)
                            }
                            const newDataFriendObject = {
                                current: await replaceFriendRequestIDsWithObject(newDataFriend.current),
                                outgoing: await replaceFriendRequestIDsWithObject(newDataFriend.outgoing),
                                pending: await replaceFriendRequestIDsWithObject(newDataFriend.pending)
                            }

                            io.in(sender.uid).emit('friendRequest-client', { data: newDataSenderObject })
                            io.in(friend.uid).emit('friendRequest-client', { data: newDataFriendObject })
                        }

                        if (status.state == 'pending' && status.action == 'accept') {
                            cb({ success: `You are now friends with @${friend.username}!` })
                        } else if (status.state == 'pending' && status.action == 'decline') {
                            cb({ success: `Friend request from @${friend.username} declined.` })
                        } else if (status.state == 'outgoing' && status.action == 'cancel') {
                            cb({ success: `Friend request to @${friend.username} cancelled.` })
                        }
                    }
                } catch (error) {
                    console.log(error)
                    cb({ error: 'Oops! There was an error. Try again later.' })
                }
            })
            socket.on('friendRemove-server', async (data, cb) => {
                try {
                    const token = data.accessToken
                    const user = decodeJWT(token)
                    if (!user) return cb(null)
                    else {
                        const friendUser = data.friend
                        const friend = await QueryUser({ user: friendUser })
                        const sender = await QueryUser({ user: { token: user.token } })

                        const newDataSender = {
                            current: sender.friends.current.filter(uid => uid != friend.uid),
                            outgoing: sender.friends.outgoing.filter(uid => uid != friend.uid),
                            pending: sender.friends.pending.filter(uid => uid != friend.uid)
                        }
                        const newDataFriend = {
                            current: friend.friends.current.filter(uid => uid != sender.uid),
                            outgoing: friend.friends.outgoing.filter(uid => uid != sender.uid),
                            pending: friend.friends.pending.filter(uid => uid != sender.uid)
                        }

                        await UpdateUser({ user: { token: sender.token }, newData: { friends: newDataSender } })
                        await UpdateUser({ user: { token: friend.token }, newData: { friends: newDataFriend } })

                        const newDataSenderObject = {
                            current: await replaceFriendRequestIDsWithObject(newDataSender.current),
                            outgoing: await replaceFriendRequestIDsWithObject(newDataSender.outgoing),
                            pending: await replaceFriendRequestIDsWithObject(newDataSender.pending)
                        }
                        const newDataFriendObject = {
                            current: await replaceFriendRequestIDsWithObject(newDataFriend.current),
                            outgoing: await replaceFriendRequestIDsWithObject(newDataFriend.outgoing),
                            pending: await replaceFriendRequestIDsWithObject(newDataFriend.pending)
                        }

                        io.in(sender.uid).emit('friendRequest-client', { data: newDataSenderObject })
                        io.in(friend.uid).emit('friendRequest-client', { data: newDataFriendObject })

                        cb({ success: `You are no longer friends with @${friend.username}!` })
                    }
                } catch (error) {
                    console.log(error)
                    cb({ error: 'Oops! There was an error. Try again later.' })
                }
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