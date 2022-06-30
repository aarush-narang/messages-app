import { Server } from 'socket.io'
import { QueryGroup, QueryUser, UpdateUser, UpdateGroup, DeleteGroup, InsertGroup } from '../../../../lib/mongo'
import { apiHandler } from '../../../../lib/helpers/api-handler'
import { decodeJWT } from '../../../../lib/helpers/jwt-middleware'
import SnowflakeID from 'snowflake-id'

const MAX_BUFFER_SIZE = 50 // max message size in mb
const authors = [] // keep in memory for less db calls
const userIdsToSocketIds = new Map()
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
        if (!message.system) {
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
                                await socket.join(group.id)
                            } catch (error) {
                                console.log(`${user.username} failed to join group ${group.id}`)
                            }
                        }
                        userIdsToSocketIds.set(user.uid, socket.id)
                        await socket.join(user.uid)

                        const groupInfo = []
                        for (let i = 0; i < groups.length; i++) {
                            const group = await QueryGroup({ groupId: groups[i].id })
                            for (let j = 0; j < group.members.length; j++) {
                                group.members[j] = await fetchUserObjectWithUserID(group.members[j])
                            }
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
                    console.log(error, 'init-server')
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
                    console.log(error, 'currentGroupChange-server')
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
                    console.log(error, 'loadMessages-server')
                    cb(null)
                }

            })
            socket.on('updateGroupOrder-server', async (data) => { // when they change order of their groups, update the order in the database, 
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
                    console.log(error, 'updateGroupOrder-server')
                }

            })

            // message events
            socket.on('messageCreate-server', async (data) => {
                try {
                    const token = data.accessToken
                    const user = decodeJWT(token)
                    if (!user) return
                    else {
                        const groupId = data.groupId

                        const group = await QueryGroup({ groupId })

                        if (!group.members.includes(user.uid)) return

                        const id = Number(messageSnowflake.generate())
                        const author = user.uid
                        const message = data.message
                        const createdAt = Date.now()
                        const edited = false
                        const read = []
                        const system = false

                        const messageObj = { id, author, message, createdAt, edited, read, system }
                        const newMessage = await replaceMessagesAuthorId([{ id, author, message, createdAt, edited, read, system }]).then(messages => messages[0])

                        if (group) {
                            await UpdateGroup({ groupId, newData: { messages: group.messages.concat([messageObj]) } }).catch(err => console.log(err)) // add message to the end
                            io.in(groupId).emit('messageCreate-client', { message: newMessage, groupId }) // broadcast message to all users in the group
                        }
                    }
                } catch (error) {
                    console.log(error, 'messageCreate-server')
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

                        if (!group.members.includes(user.uid)) return cb(null)

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
                    console.log(error, 'messageDelete-server')
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

                        if (!group.members.includes(user.uid)) return cb(null)

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
                    console.log(error, 'messageEdit-server')
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
                    console.log(error, 'friendRequest-server')
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
                    console.log(error, 'friendRequestManage-server')
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
                    console.log(error, 'friendRemove-server')
                    cb({ error: 'Oops! There was an error. Try again later.' })
                }
            })

            // group events
            socket.on('groupCreate-server', async (data, cb) => {
                try {
                    const token = data.accessToken
                    const user = decodeJWT(token)
                    if (!user) return cb(null)
                    else {
                        const name = data.newGroupName
                        const members = [user.uid].concat(data.newGroupMembers)

                        const newGroup = await InsertGroup({ group: { name, members, owner: user.uid } })

                        const filteredGroup = Object.entries(newGroup).filter(([key, value]) => !['_id', 'messages'].includes(key))
                        const groupInfo = Object.fromEntries(filteredGroup)

                        // replace member uids with user objects
                        for (let i = 0; i < groupInfo.members.length; i++) {
                            groupInfo.members[i] = await fetchUserObjectWithUserID(groupInfo.members[i])
                        }

                        for (const uid of members) {
                            // update user's groups object where order is stored w/ group id
                            const user = await QueryUser({ user: { uid } })
                            const newData = {
                                groups: user.groups.concat([{ id: newGroup.id, order: user.groups.length }])
                            }
                            await UpdateUser({ user: { token: user.token }, newData })

                            // user join socket
                            if (userIdsToSocketIds.get(uid)) io.sockets.sockets.get(userIdsToSocketIds.get(uid)).join(newGroup.id)


                            // emit to all users in the group
                            io.in(uid).emit('groupCreate-client', { newGroup: groupInfo })
                            cb({ success: true })
                        }
                    }
                } catch (error) {
                    console.log(error, 'groupCreate-server')
                    cb({ error: 'Oops! There was an error. Try again later.' })
                }
            })
            socket.on('groupEdit-server', async (data, cb) => {
                try {
                    const token = data.accessToken
                    const user = decodeJWT(token)
                    if (!user) return cb(null)
                    else {
                        const groupId = data.groupId
                        const oldGroup = await QueryGroup({ groupId })

                        const newGroupName = data.newGroupName
                        const newGroupIcon = data.newGroupIcon
                        const newData = {}
                        let updateEvent = ''

                        if (newGroupName) { // if group name is changed
                            newData.name = newGroupName
                            updateEvent = 'edit-name'
                        }
                        if (newGroupIcon) {
                            newData.icon = newGroupIcon
                            updateEvent = 'edit-icon'
                        }

                        // Send system message to group that says group name was edited
                        const id = Number(messageSnowflake.generate())
                        const author = null
                        const message = {
                            data: {
                                username: user.username,
                                uid: user.uid,
                            },
                            type: updateEvent,
                        }

                        if (newGroupName) {
                            message.data.oldName = oldGroup.name
                            message.data.newName = newGroupName
                        } else if (newGroupIcon) {
                            message.data.oldIcon = oldGroup.icon
                            message.data.newIcon = newGroupIcon
                        }

                        const createdAt = Date.now()
                        const edited = false
                        const read = []
                        const system = true

                        const messageObj = { id, author, message, createdAt, edited, read, system }
                        newData.messages = oldGroup.messages.concat([messageObj])

                        const updatedGroup = await UpdateGroup({ groupId, newData })
                        io.in(groupId).emit('groupEdit-client', { newGroup: updatedGroup })
                        io.in(groupId).emit('messageCreate-client', { message: messageObj, groupId })

                        cb({ success: true })
                    }
                } catch (error) {
                    console.log(error, 'groupEdit-server')
                    cb({ success: false, message: 'Oops! There was an error. Try again later.' })
                }
            })
            socket.on('groupDelete-server', async (data, cb) => {
                try {
                    const token = data.accessToken
                    const user = decodeJWT(token)
                    if (!user) return cb({ success: false, message: 'Oops! There was an error. Try again later.' })
                    else {
                        const groupId = data.groupId
                        const group = await QueryGroup({ groupId })
                        if (!group) return cb({ success: false, message: 'Group does not exist.' })
                        else {
                            const groupMembers = group.members
                            for (const uid of groupMembers) { // remove group from all members's group order
                                const user = await QueryUser({ user: { uid } })
                                const newData = user.groups.filter(group => group.id != groupId)
                                await UpdateUser({ user: { token: user.token }, newData: { groups: newData } })
                            }
                            await DeleteGroup({ groupId })

                            io.in(groupId).emit('groupDelete-client', { groupId })
                            cb({ success: true })
                        }
                    }
                } catch (error) {
                    console.log(error, 'groupDelete-server')
                    cb({ success: false, message: 'Oops! There was an error. Try again later.' })
                }
            })
            socket.on('groupJoin-server', async (data, cb) => {
                try {
                    const token = data.accessToken
                    const user = decodeJWT(token)
                    if (!user) return cb({ success: false, message: 'Oops! There was an error. Try again later.' })
                    else {
                        const groupId = data.groupId
                        const group = await QueryGroup({ groupId })
                        if (!group) return cb({ success: false, message: 'Group does not exist.' })
                        else {
                            const addedMembers = data.addedMembers
                            const newDataGroup = {
                                members: [...group.members]
                            }

                            for (const uid of addedMembers) { // manage each user that joined the group
                                // add them to the group socket
                                if (userIdsToSocketIds.get(uid)) io.sockets.sockets.get(userIdsToSocketIds.get(uid)).join(groupId)
                                // update their groups in the users collection
                                const newUser = await QueryUser({ user: { uid } })
                                const groups = [...newUser.groups]
                                if (groups.includes(groupId)) continue
                                newDataGroup.members.push(uid)
                                groups.push({ id: groupId, order: groups.length })
                                await UpdateUser({ user: { token: newUser.token }, newData: { groups } })

                                // Send system message to group that says they joined
                                const id = Number(messageSnowflake.generate())
                                const author = null
                                const message = {
                                    data: {
                                        username: newUser.username,
                                        uid: newUser.uid,
                                        manager: {
                                            username: user.username,
                                            uid: user.uid
                                        }
                                    },
                                    type: 'add',
                                }
                                const createdAt = Date.now()
                                const edited = false
                                const read = []
                                const system = true

                                const messageObj = { id, author, message, createdAt, edited, read, system }

                                await UpdateGroup({ groupId, newData: { messages: group.messages.concat([messageObj]) } })
                                io.in(groupId).emit('messageCreate-client', { message: messageObj, groupId })
                            }

                            // send all members a socket event to update their groups
                            const filteredGroup = Object.entries(group).filter(([key, value]) => !['_id', 'messages'].includes(key))
                            const groupInfo = Object.fromEntries(filteredGroup)
                            groupInfo.members = groupInfo.members.concat(addedMembers)
                            // replace member uids with user objects
                            for (let i = 0; i < groupInfo.members.length; i++) {
                                groupInfo.members[i] = await fetchUserObjectWithUserID(groupInfo.members[i])
                            }
                            
                            io.in(groupId).emit('groupJoin-client', { newGroup: groupInfo })

                            await UpdateGroup({ groupId, newData: newDataGroup }) // update the group members
                            cb({ success: true })
                        }
                    }
                } catch (error) {
                    console.log(error, 'groupJoin-server')
                    cb({ success: false, message: 'Oops! There was an error. Try again later.' })
                }
            })
            socket.on('groupLeave-server', async (data, cb) => {
                try {
                    const token = data.accessToken
                    const user = decodeJWT(token)
                    if (!user) return cb({ success: false, message: `Oops! There was an error, please try again later.` })
                    else {
                        const groupId = data.groupId
                        const group = await QueryGroup({ groupId })
                        const sender = await QueryUser({ user: { token: user.token } })

                        if (group) {
                            await UpdateUser({ user: { token: sender.token }, newData: { groups: sender.groups.filter(obj => obj.id != groupId) } })

                            const newMembers = group.members.filter(uid => uid != sender.uid)
                            const newData = {
                                members: newMembers,
                                messages: []
                            }


                            if (newMembers.length == 0) {
                                await DeleteGroup({ groupId })
                            }
                            else {
                                if (sender.uid == group.owner) {
                                    const newOwner = newMembers[0] // next member becomes new owner
                                    newData.owner = newOwner

                                    const newUser = await QueryUser({ user: { uid: newOwner } })

                                    // Send system message to group that says next member is new owner
                                    const id = Number(messageSnowflake.generate())
                                    const author = null
                                    const message = {
                                        data: {
                                            username: newUser.username,
                                            uid: newUser.uid,
                                            manager: {
                                                username: sender.username,
                                                uid: sender.uid
                                            }
                                        },
                                        type: 'promote',
                                    }
                                    const createdAt = Date.now()
                                    const edited = false
                                    const read = []
                                    const system = true

                                    const messageObj = { id, author, message, createdAt, edited, read, system }

                                    newData.messages.push(messageObj)

                                    io.in(groupId).emit('messageCreate-client', { message: messageObj, groupId })
                                }

                                // Send system message to group that says user left
                                const id = Number(messageSnowflake.generate())
                                const author = null
                                const message = {
                                    data: {
                                        username: sender.username,
                                        uid: sender.uid,
                                    },
                                    type: 'leave',
                                }
                                const createdAt = Date.now()
                                const edited = false
                                const read = []
                                const system = true

                                const messageObj = { id, author, message, createdAt, edited, read, system }

                                newData.messages.push(messageObj)

                                newData.messages = group.messages.concat(newData.messages)

                                await UpdateGroup({ groupId, newData })
                                io.in(groupId).emit('messageCreate-client', { message: messageObj, groupId })
                            }

                            // replace member uids with user objects
                            for (let i = 0; i < newMembers.length; i++) {
                                newMembers[i] = await fetchUserObjectWithUserID(newMembers[i])
                            }

                            io.to(groupId).emit('groupLeave-client', {
                                groupId, members: newMembers, owner: newData.owner ? newData.owner : null, userId: sender.uid
                            })

                            io.sockets.sockets.get(userIdsToSocketIds.get(sender.uid)).leave(groupId)
                            cb({ success: true, message: `You have left ${group.name}.` })
                        } else {
                            cb({ success: false, message: `Oops! There was an error, please try again later.` })
                        }
                    }
                } catch (error) {
                    cb({ success: false, message: `Oops! There was an error, please try again later.` })
                    console.log(error, 'groupLeave-server')
                }
            })
            socket.on('groupMemberRemove-server', async (data, cb) => {
                try {
                    const token = data.accessToken
                    const user = decodeJWT(token)
                    if (!user) return cb({ success: false, message: `Oops! There was an error, please try again later.` })
                    else {
                        const groupId = data.groupId
                        const userId = data.userId
                        const group = await QueryGroup({ groupId })
                        const removedUser = await QueryUser({ user: { uid: userId } })

                        if (group && removedUser) {
                            await UpdateUser({ user: { uid: userId }, newData: { groups: removedUser.groups.filter(obj => obj.id != groupId) } })

                            const newMembers = group.members.filter(uid => uid != removedUser.uid)
                            const newData = {
                                members: newMembers,
                            }

                            if (newMembers.length == 0) {
                                await DeleteGroup({ groupId })
                            }
                            else {

                                // Send system message to group that says user was removed
                                const id = Number(messageSnowflake.generate())
                                const author = null
                                const message = {
                                    data: {
                                        username: removedUser.username,
                                        uid: removedUser.uid,
                                        manager: {
                                            username: user.username,
                                            uid: user.uid
                                        }
                                    },
                                    type: 'remove',
                                }
                                const createdAt = Date.now()
                                const edited = false
                                const read = []
                                const system = true

                                const messageObj = { id, author, message, createdAt, edited, read, system }

                                newData.messages = group.messages.concat([messageObj])

                                await UpdateGroup({ groupId, newData })
                                io.in(groupId).emit('messageCreate-client', { message: messageObj, groupId })
                            }

                            // replace member uids with user objects
                            for (let i = 0; i < newMembers.length; i++) {
                                newMembers[i] = await fetchUserObjectWithUserID(newMembers[i])
                            }

                            io.to(groupId).emit('groupLeave-client', {
                                groupId, members: newMembers, userId: removedUser.uid
                            })

                            if (userIdsToSocketIds.get(removedUser.uid)) io.sockets.sockets.get(userIdsToSocketIds.get(removedUser.uid)).leave(groupId)
                            cb({ success: true })
                        } else {
                            cb({ success: false, message: `Oops! There was an error, please try again later.` })
                        }
                    }
                } catch (error) {
                    cb({ success: false, message: `Oops! There was an error, please try again later.` })
                    console.log(error, 'groupMemberRemove-server')
                }
            })
            socket.on('groupOwnerChange-server', async (data, cb) => {
                try {
                    const token = data.accessToken
                    const user = decodeJWT(token)
                    if (!user) return cb({ success: false, message: `Oops! There was an error, please try again later.` })
                    else {
                        const groupId = data.groupId
                        const newOwner = data.userId
                        const group = await QueryGroup({ groupId })

                        if (group && group.owner != user.uid) return cb({ success: false, message: `You are not the owner of this group.` })

                        if (group) {
                            const newUser = await QueryUser({ user: { uid: newOwner } })
                            const newData = {
                                owner: newUser.uid,
                            }

                            // Send system message to group that says user was promoted
                            const id = Number(messageSnowflake.generate())
                            const author = null
                            const message = {
                                data: {
                                    username: newUser.username,
                                    uid: newUser.uid,
                                    manager: {
                                        username: user.username,
                                        uid: user.uid
                                    }
                                },
                                type: 'promote',
                            }
                            const createdAt = Date.now()
                            const edited = false
                            const read = []
                            const system = true

                            const messageObj = { id, author, message, createdAt, edited, read, system }

                            newData.messages = group.messages.concat([messageObj])

                            await UpdateGroup({ groupId, newData })
                            io.in(groupId).emit('messageCreate-client', { message: messageObj, groupId })
                            io.in(groupId).emit('groupOwnerChange-client', { groupId, newOwner: newUser.uid })
                            cb({ success: true })
                        } else {
                            cb({ success: false, message: `Oops! There was an error, please try again later.` })
                        }
                    }
                } catch (error) {
                    cb({ success: false, message: `Oops! There was an error, please try again later.` })
                    console.log(error, 'groupOwnerChange-server')
                }
            })

            socket.on('disconnect', () => {
                const entries = [...userIdsToSocketIds.entries()]
                entries.forEach(([key, value]) => {
                    if (value == socket.id) {
                        userIdsToSocketIds.delete(key)
                    }
                })
            })
        })



        res.socket.server.io = io
    } else {
        console.log('socket.io already running')
    }
    res.end()
}

export default apiHandler(ioHandler, ['jwt', 'csrf'])