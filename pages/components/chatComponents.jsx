// Styles
import chatStyles from "../../styles/ChatStyles/ChatComponentStyles.module.css";
import groupStyles from "../../styles/ChatStyles/GroupComponentStyles.module.css";
import friendStyles from "../../styles/ChatStyles/FriendComponentsStyles.module.css";
import fileStyles from "../../styles/FileViews/FileViews.module.css";
// Util + React Hooks + Components
import { useState, useEffect, useRef } from "react";
import { useDebounce, shortenName, formatBytes, shortenFileName, calculateFileSize, downloadBase64File, formatDuration, gcd, formatMessageInput } from "./util";
import { Spinner } from "./formComponents";
import { AttachedFileView, AudioFileView, DefaultFileView, ImageFileView, TextFileView, VideoFileView } from './fileViewComponents'
// Util Packages
import jsCookie from "js-cookie";
import moment from "moment";

const SPINNER_COLOR = '#2e8283'
const MAX_FILE_SIZE_BYTES = 50 * (1024 * 1024); // 50 MB in bytes
const MAX_MESSAGE_LEN = 6000

// Main Components For Chat
export function GroupsComponent({ groups, csrfToken, currentGroup, userState, socket, ctxMenu, ctxMenuPos, ctxMenuData, setNotificationState }) {
    if (currentGroup && !(groups.find(group => group.id == currentGroup.id))) { // if current group is not in groups, render spinner
        return (
            <PageLoading />
        )
    }
    groups.sort((a, b) => a.order - b.order)


    const [user, setUser] = userState

    // start the groups menu open or closed
    const [menuState, setMenuState] = useState(false); // true = closed, false = open

    // Tab States
    const [tabState, setTabState] = useState('groups'); // groups or friends
    const [friendsTabState, setFriendsTabState] = useState('current'); // current, pending, or outgoing
    const addFriendsTxtboxRef = useRef(null);

    useEffect(() => {
        setMenuState(window.innerWidth < 900)
        window.addEventListener('resize', () => { if (window.innerWidth < 900) setMenuState(true) })

        // socket listeners
        socket.on('friendRequest-client', (data) => {
            const newUserData = data.data
            setUser({ ...user, friends: newUserData })
        })
    }, [])

    // draggable groups
    const [order, setOrder] = useState(groups.map(group => { // set the initial order of the groups
        return {
            id: group.id,
            order: group.order
        }
    }))

    // Sends updated group order to server
    useDebounce(async () => { // debounce the order of the groups & update the in db
        socket.emit('updateGroupOrder-server', { accessToken: jsCookie.get('accessToken'), order })
        setNotificationState({ state: 'success', data: { message: 'Group order updated' } })
    }, 1000, [order])

    useEffect(() => { // update the order of the groups (visually) when the order changes
        if (tabState == 'friends') return
        const draggables = document.querySelectorAll(`.${groupStyles.group}`);
        const container = document.querySelector(`.${groupStyles.groups}`);
        draggables.forEach(draggable => {
            draggable.addEventListener('dragstart', () => {
                draggable.classList.add(groupStyles.dragging);
            });
            draggable.addEventListener('dragend', () => {
                draggable.classList.remove(groupStyles.dragging);
            });
        })

        container.addEventListener('dragover', e => {
            e.preventDefault()
            const afterElement = getDragAfterElement(container, e.clientY)
            const draggable = document.querySelector(`.${groupStyles.dragging}`)
            if (draggable == null || draggable.nextSibling === afterElement) return; // prevent unnecessary DOM changes
            if (afterElement == null) {
                container.appendChild(draggable)
            } else {
                container.insertBefore(draggable, afterElement)
            }
            const newOrder = Array.from(container.children).map((child, order) => {
                const dataset = { ...child.dataset } // convert domstringmap to js object
                return {
                    id: dataset.groupid,
                    order
                }
            })
            if (order !== newOrder) setOrder(newOrder)

        })

        function getDragAfterElement(container, y) {
            const draggableElements = [...container.querySelectorAll(`.${groupStyles.group}:not(.${groupStyles.dragging})`)]

            return draggableElements.reduce((closest, child) => {
                const box = child.getBoundingClientRect()
                const offset = y - box.top - box.height / 2
                if (offset < 0 && offset > closest.offset) {
                    return { offset: offset, element: child }
                } else {
                    return closest
                }
            }, { offset: Number.NEGATIVE_INFINITY }).element
        }
    }, [tabState])

    return (
        <div
            className={groupStyles.left}
            style={{
                minWidth: menuState ? '46px' : '350px',
                width: menuState ? '46px' : '360px',
                maxWidth: menuState ? '46px' : '700px',
                resize: menuState ? 'none' : 'horizontal',
                overflow: 'hidden',
            }}
        >
            <div className={groupStyles.groupsContainer} style={{ opacity: `${menuState ? '0' : '1'}`, gridTemplateRows: tabState.toLowerCase() == 'groups' ? '40px 1fr 100px' : '40px 38px 40px 1fr 100px' }}>
                <div className={groupStyles.groupTabSwitchContainer} style={{ width: `${menuState ? '0px' : '100%'}` }}>
                    <button className={groupStyles.groupTabSwitch} data-selected={tabState.toLowerCase() == 'groups'}
                        onClick={() => setTabState('groups')}
                    >Groups</button>
                    <button className={groupStyles.groupTabSwitch} data-selected={tabState.toLowerCase() == 'friends'}
                        onClick={() => setTabState('friends')}
                    >Friends</button>
                </div>
                {
                    tabState.toLowerCase() == 'groups' ?
                        <div className={groupStyles.groups} style={{ opacity: menuState ? '0' : '1', width: `${menuState ? '0px' : '100%'}` }}>
                            {
                                groups.length > 0 ?
                                    groups.map(group => {
                                        return (
                                            // group container
                                            <Group key={group.id} group={group} currentGroup={currentGroup} ctxMenu={ctxMenu} ctxMenuPos={ctxMenuPos} ctxMenuData={ctxMenuData} />
                                        )
                                    }) :
                                    <div className={groupStyles.noGroupsContainer}>
                                        <div></div>
                                        <h2 style={{ textAlign: 'center' }}>No Direct Messages or Groups created/joined</h2>
                                        <div className={groupStyles.joinGroup} onClick={() => {
                                            // TODO: pop up a modal to create a group or to create a dm
                                        }}>control_point</div>
                                        <div></div>
                                    </div>
                            }
                        </div>
                        :
                        <>
                            <div className={groupStyles.friendsHeader}>
                                <form className={groupStyles.friendsHeaderForm}
                                    onSubmit={(e) => {
                                        e.preventDefault()
                                        const formData = new FormData(e.target)
                                        const friend = formData.get('friends_search')
                                        e.target.reset()
                                        addFriendsTxtboxRef.current.focus()
                                        if (friend.length == 0) return
                                        if (friend.slice(1) == user.username || friend == user.uid) return setNotificationState({ state: 'error', data: { message: 'You cannot add yourself' } })

                                        const friendReq = {}
                                        if (friend.includes('@')) { // username
                                            friendReq.username = friend.slice(1)
                                        } else {
                                            friendReq.uid = parseInt(friend)
                                        }
                                        socket.emit('friendRequest-server', { accessToken: jsCookie.get('accessToken'), friend: friendReq }, (data) => {
                                            if (data.error) setNotificationState({ state: 'error', data: { message: data.error } })
                                            else if (data.success) setNotificationState({ state: 'success', data: { message: data.success } })
                                            else setNotificationState({ state: 'success', data: { message: data.success } })
                                        })
                                    }}
                                >
                                    <input
                                        className={groupStyles.searchFriendsInput}
                                        placeholder="Add with @username or by user ID"
                                        type="text"
                                        name="friends_search"
                                        autoCapitalize="none"
                                        autoComplete="off"
                                        autoCorrect="off"
                                        spellCheck="false"
                                        ref={addFriendsTxtboxRef}
                                    />
                                    <button className={groupStyles.addFriendsButton} type={"submit"}>person_add</button>
                                </form>
                            </div>
                            <div className={groupStyles.groupTabSwitchContainer} style={{ width: `${menuState ? '0px' : '100%'}` }}>
                                <button className={groupStyles.groupTabSwitch} data-selected={friendsTabState.toLowerCase() == 'current'}
                                    onClick={() => setFriendsTabState('current')}
                                >Current</button>
                                <button className={groupStyles.groupTabSwitch} data-selected={friendsTabState.toLowerCase() == 'pending'}
                                    onClick={() => setFriendsTabState('pending')}
                                >Pending</button>
                                <button className={groupStyles.groupTabSwitch} data-selected={friendsTabState.toLowerCase() == 'outgoing'}
                                    onClick={() => setFriendsTabState('outgoing')}
                                >Outgoing</button>
                            </div>
                            <div className={groupStyles.friends} style={{ opacity: menuState ? '0' : '1', width: `${menuState ? '0px' : '100%'}` }}>

                                {/* <div className={groupStyles.friendsContainer}> */}
                                {
                                    friendsTabState.toLowerCase() == 'current' ?
                                        user.friends.current.length > 0 ?
                                            user.friends.current.map(friend => {
                                                return (
                                                    <CurrentFriend
                                                        key={friend.uid}
                                                        friend={friend}
                                                        groups={groups}
                                                        socket={socket}
                                                        setNotificationState={setNotificationState}
                                                    />
                                                )
                                            }) :
                                            <div className={groupStyles.noFriendsContainer}>
                                                Oh no, you have no friends added! Go to the <a onClick={() => addFriendsTxtboxRef.current.focus()}>textbox</a> above and add somebody!
                                            </div>
                                        :
                                        friendsTabState.toLowerCase() == 'pending' ?
                                            user.friends.pending.length > 0 ?
                                                user.friends.pending.map(friend => {
                                                    return (
                                                        // friend container
                                                        <PendingFriend
                                                            key={friend.uid}
                                                            friend={friend}
                                                            groups={groups}
                                                            socket={socket}
                                                            currentGroup={currentGroup}
                                                            setNotificationState={setNotificationState}
                                                        />
                                                    )
                                                }) :
                                                <div className={groupStyles.noFriendsContainer}>
                                                    You have no pending friend requests!
                                                </div>
                                            :
                                            friendsTabState.toLowerCase() == 'outgoing' ?
                                                user.friends.outgoing.length > 0 ?
                                                    user.friends.outgoing.map((friend) => {
                                                        return (
                                                            // friend container
                                                            <OutgoingFriend
                                                                key={friend.uid}
                                                                friend={friend}
                                                                groups={groups}
                                                                socket={socket}
                                                                currentGroup={currentGroup}
                                                                setNotificationState={setNotificationState}
                                                            />
                                                        )
                                                    }) :
                                                    <div className={groupStyles.noFriendsContainer}>
                                                        You have no outgoing friend requests. Go to the <a onClick={() => addFriendsTxtboxRef.current.focus()}>textbox</a> above and add somebody!
                                                    </div>
                                                :
                                                null
                                }
                                {/* </div> */}
                            </div>
                        </>
                }
                {
                    groups.length > 0 ?
                        <div style={{ display: `${menuState ? 'none' : 'flex'}`, justifyContent: 'center' }}>
                            <div className={groupStyles.joinGroup} style={{ marginTop: '20px', fontSize: '50px' }} onClick={() => {
                                // TODO: pop up a modal to create a group or to create a dm
                            }}>control_point</div>
                        </div> :
                        null

                }
            </div>
            <a className={groupStyles.arrow} style={{ transform: `${menuState ? 'rotate(180deg)' : 'rotate(0deg)'}` }} onClick={
                (e) => {
                    setMenuState(!menuState)
                }
            }>&#171;</a>
        </div>
    );
}
export function CurrentFriend({ friend, groups, socket, setNotificationState }) {
    const mutualGroupIcons = groups.filter(group => {
        if (group.members.includes(friend.uid)) {
            return {
                icon: group.icon,
                name: group.name
            }
        }
    })

    const [confirmRemoveState, setConfirmRemoveState] = useState(false)

    return (
        <div className={friendStyles.friendContainer}>
            <section className={friendStyles.friendSection1}>
                <img src={friend.icon} alt={`friend.username's avatar`} className={friendStyles.friendIcon} />
            </section>
            <section className={friendStyles.friendSection2}>
                <div className={friendStyles.friendHeader}>
                    <div className={friendStyles.friendUsername} title={friend.username}>@{shortenName(friend.username, 18)}</div>
                    <div className={friendStyles.mutualGroups}>
                        {
                            mutualGroupIcons.map((group, i) => {
                                return (
                                    <img key={i} src={group.icon} title={`Mutual Group "${group.name}" with @${friend.username}`} alt={`Mutual Group "${group.name}" with @${friend.username}`} className={friendStyles.mutualGroupIcon} />
                                )
                            })
                        }
                    </div>
                </div>
                <div className={friendStyles.friendButtons}>
                    {
                        confirmRemoveState ?
                            <div>
                                Are you sure you want to remove <b>@{friend.username}</b> from your friends?
                                <div className={friendStyles.friendButtons}>
                                    <button className={`${friendStyles.friendButton} ${friendStyles.friendAccept}`} title={`Accept @${friend.username}'s friend request`}
                                        onClick={() => {
                                            socket.emit('friendRemove-server', { accessToken: jsCookie.get('accessToken'), friend, status: { action: 'remove', state: 'current' } }, (data) => {
                                                if (data.error) setNotificationState({ state: 'error', data: { message: data.error } })
                                                else if (data.success) setNotificationState({ state: 'success', data: { message: data.success } })
                                                else setNotificationState({ state: 'success', data: { message: data.success } })
                                            })
                                        }}
                                    >check_circle</button>
                                    <button className={`${friendStyles.friendButton} ${friendStyles.friendDecline}`} title={`Decline @${friend.username}'s friend request`}
                                        onClick={() => {
                                            setNotificationState({ state: 'warning', data: { message: `Cancelled` } })
                                            setConfirmRemoveState(false)
                                        }}
                                    >cancel</button>
                                </div>
                            </div>
                            :
                            <button className={`${friendStyles.friendButton} ${friendStyles.friendDecline}`} title={`Remove @${friend.username} from your friends`}
                                onClick={() => setConfirmRemoveState(true)}
                            >person_remove</button>
                    }
                </div>
            </section>
        </div>
    )
}
export function PendingFriend({ friend, groups, socket, setNotificationState }) {
    const mutualGroupIcons = groups.filter(group => {
        if (group.members.includes(friend.uid)) {
            return {
                icon: group.icon,
                name: group.name
            }
        }
    })
    return (
        <div className={friendStyles.friendContainer}>
            <section className={friendStyles.friendSection1}>
                <img src={friend.icon} alt={`friend.username's avatar`} className={friendStyles.friendIcon} />
            </section>
            <section className={friendStyles.friendSection2}>
                <div className={friendStyles.friendHeader}>
                    <div className={friendStyles.friendUsername} title={friend.username}>@{shortenName(friend.username, 18)}</div>
                    <div className={friendStyles.mutualGroups}>
                        {
                            mutualGroupIcons.map((group, i) => {
                                return (
                                    <img key={i} src={group.icon} title={`Mutual Group "${group.name}" with @${friend.username}`} alt={`Mutual Group "${group.name}" with @${friend.username}`} className={friendStyles.mutualGroupIcon} />
                                )
                            })
                        }
                    </div>
                </div>
                <div className={friendStyles.friendButtons}>
                    <button className={`${friendStyles.friendButton} ${friendStyles.friendAccept}`} title={`Accept @${friend.username}'s friend request`}
                        onClick={() => {
                            socket.emit('friendRequestManage-server', { accessToken: jsCookie.get('accessToken'), friend, status: { action: 'accept', state: 'pending' } }, (data) => {
                                if (data.error) setNotificationState({ state: 'error', data: { message: data.error } })
                                else if (data.success) setNotificationState({ state: 'success', data: { message: data.success } })
                                else setNotificationState({ state: 'success', data: { message: data.success } })
                            })
                        }}
                    >check_circle</button>
                    <button className={`${friendStyles.friendButton} ${friendStyles.friendDecline}`} title={`Decline @${friend.username}'s friend request`}
                        onClick={() => {
                            socket.emit('friendRequestManage-server', { accessToken: jsCookie.get('accessToken'), friend, status: { action: 'decline', state: 'pending' } }, (data) => {
                                if (data.error) setNotificationState({ state: 'error', data: { message: data.error } })
                                else if (data.success) setNotificationState({ state: 'success', data: { message: data.success } })
                                else setNotificationState({ state: 'success', data: { message: data.success } })
                            })
                        }}
                    >cancel</button>
                </div>
            </section>
        </div>
    )

}
export function OutgoingFriend({ friend, groups, socket, setNotificationState }) {
    const mutualGroupIcons = groups.filter(group => {
        if (group.members.includes(friend.uid)) {
            return {
                icon: group.icon,
                name: group.name
            }
        }
    })
    return (
        <div className={friendStyles.friendContainer}>
            <section className={friendStyles.friendSection1}>
                <img src={friend.icon} alt={`friend.username's avatar`} className={friendStyles.friendIcon} />
            </section>
            <section className={friendStyles.friendSection2}>
                <div className={friendStyles.friendHeader}>
                    <div className={friendStyles.friendUsername} title={friend.username}>@{shortenName(friend.username, 18)}</div>
                    <div className={friendStyles.mutualGroups}>
                        {
                            mutualGroupIcons.map((group, i) => {
                                return (
                                    <img key={i} src={group.icon} title={`Mutual Group "${group.name}" with @${friend.username}`} alt={`Mutual Group "${group.name}" with @${friend.username}`} className={friendStyles.mutualGroupIcon} />
                                )
                            })
                        }
                    </div>
                </div>
                <div className={friendStyles.friendButtons}>
                    <button className={`${friendStyles.friendButton} ${friendStyles.friendDecline}`} title={`Cancel your friend request to @${friend.username}`}
                        onClick={() => {
                            socket.emit('friendRequestManage-server', { accessToken: jsCookie.get('accessToken'), friend, status: { action: 'cancel', state: 'outgoing' } }, (data) => {
                                if (data.error) setNotificationState({ state: 'error', data: { message: data.error } })
                                else if (data.success) setNotificationState({ state: 'success', data: { message: data.success } })
                                else setNotificationState({ state: 'success', data: { message: data.success } })
                            })
                        }}
                    >cancel</button>
                </div>
            </section>
        </div>
    )
}
export function Group({ group, currentGroup, ctxMenu, ctxMenuPos, ctxMenuData }) {
    const [contextMenu, setContextMenu] = ctxMenu
    const [contextMenuPos, setContextMenuPos] = ctxMenuPos
    const [contextMenuData, setContextMenuData] = ctxMenuData

    return (
        <div
            key={group.id}
            data-contexttype="GROUP"
            data-groupid={group.id}
            data-selected={currentGroup && group.id == currentGroup.id}
            className={groupStyles.group}
            draggable
            onClick={() => {
                if (currentGroup && group.id == currentGroup.id) {
                    history.pushState({ currentGroup: null }, null, `/`)
                    dispatchEvent(new PopStateEvent('popstate', { state: { currentGroup: null } }))
                } else {
                    history.pushState({ currentGroup: group }, null, `/groups/${group.id}`)
                    dispatchEvent(new PopStateEvent('popstate', { state: { currentGroup: group } }))
                }

            }}
            onContextMenu={(e) => {
                e.preventDefault()
                const path = e.nativeEvent.composedPath()
                const mainTarget = path.find(p => p.dataset && p.dataset.contexttype)
                const contextType = mainTarget ? mainTarget.dataset.contexttype : 'NONE'

                if (contextType == 'MENU') return // if context menu is right-clicked, do nothing

                const clientX = e.clientX
                const clientY = e.clientY

                setContextMenu(contextType)
                setContextMenuPos({ x: clientX, y: clientY })
                setContextMenuData({ id: group.id })
            }}
        >
            <div className={groupStyles.groupImage}>
                <img title={`${group.name}'s icon`} src={group.icon} loading={"lazy"} className={groupStyles.groupImage} alt={`${group.name}'s icon`} />
            </div>
            <div className={groupStyles.groupInfo}>
                <h4 title={group.name} className={groupStyles.groupTitle}>{shortenName(group.name)}</h4>
                <div title={`Members: ${group.members.length}`} className={groupStyles.numOfMembers}>Members: {group.members.length}</div>
            </div>
            <div className={groupStyles.lastMsg}></div>
        </div>
    )
}
export function ChatComponent({ groups, csrfToken, currentGroup, user, msgsState, socket, ctxMenu, ctxMenuPos, ctxMenuData, setNotificationState }) {
    if (currentGroup && !(groups.find(group => group.id == currentGroup.id))) {
        return (
            <PageLoading />
        )
    }
    if (!currentGroup) return <NoGroupSelected />
    const [attachedFiles, _setAttachedFiles] = useState([]) // images to be uploaded
    const attachedFilesRef = useRef(attachedFiles)
    const setAttachedFiles = (files) => {
        attachedFilesRef.current = files
        _setAttachedFiles(files)
    }

    const [scrollButton, setScrollButton] = useState(false) // if the chat is scrolled high enough, show the scroll to bottom button
    const [msgsLoading, setMsgsLoading] = useState([]) // groups that have messages loading
    const [maxMessages, setMaxMessages] = useState([]) // groups that have reached their max messages
    const topEl = useRef(null) // the message at the top of the chat

    const [messages, _setMessages] = msgsState // messages of each group that have been loaded. Stored in parent component to avoid losing data when navigating between groups
    const messagesRef = useRef(messages)
    const setMessages = (msgs) => {
        messagesRef.current = msgs
        _setMessages(msgs)
    }
    function scrollMessagesDiv(pos = null) {
        const msgsContainer = document.querySelector(`.${chatStyles.messages}`)
        msgsContainer.scrollTo(null, pos ? pos : msgsContainer.scrollHeight)
    }


    useEffect(async () => {
        if (!messages.find(grp => grp.id === currentGroup.id) && !msgsLoading.includes(currentGroup.id)) {
            // push group id to loading so that it doesn't load again
            setMsgsLoading([currentGroup.id].concat(msgsLoading))

            socket.emit('currentGroupChange-server', { groupId: currentGroup.id, accessToken: jsCookie.get('accessToken') }, (msgs) => {
                if (!msgs) return console.log('Error on server (currentGroupChange-server)');
                // push the messages to the messages array w/ group id
                setMessages([{ messages: [...msgs], id: currentGroup.id }].concat(messagesRef.current))
                // remove group from loading array
                setMsgsLoading(msgsLoading.filter(grp => grp !== currentGroup.id))
            })
        }
        // when messages load, scroll div all the way to the bottom
        scrollMessagesDiv()
    }, [currentGroup])
    useEffect(scrollMessagesDiv, [msgsLoading && !messages.find(grp => grp.id === currentGroup.id)]) // scroll to bottom when messages load for the first time only
    useEffect(() => {
        const msgsContainer = document.querySelector(`.${chatStyles.messages}`)
        const curGrpMessages = messages.find(grp => grp.id === currentGroup.id)

        if (msgsLoading.includes(currentGroup.id) && curGrpMessages) {
            socket.emit('loadMessages-server', { accessToken: jsCookie.get('accessToken'), groupId: currentGroup.id, curMsgsCt: curGrpMessages.messages.length }, (newMsgs) => {
                // new messages are added to the top
                if (newMsgs && newMsgs.length > 0) {
                    const newAppendedMessages = newMsgs.concat(curGrpMessages.messages)
                    const newMsgsObj = [{ messages: newAppendedMessages, id: currentGroup.id }].concat(messagesRef.current.filter(grp => grp.id !== currentGroup.id))

                    // set top element in messages viewport 
                    const msgs = msgsContainer.querySelectorAll(`.${chatStyles.message}`)
                    if (msgs) {
                        const topMsg = [...msgs].find(msg => msg.getBoundingClientRect().top > 0)
                        topMsg.ref = topEl
                        topEl.current = topMsg
                    }

                    // set the new messages + the old messages
                    setMessages(newMsgsObj)

                    if (topEl.current) topEl.current.scrollIntoView()
                }
                else setMaxMessages([currentGroup.id].concat(maxMessages))
                setMsgsLoading(msgsLoading.filter(grp => grp !== currentGroup.id))
            })
        }
    }, [msgsLoading.includes(currentGroup.id)])

    useEffect(() => {
        if (messages.length <= 0) return;
        socket.on('messageCreate-client', (msg) => {
            const msgsContainer = document.querySelector(`.${chatStyles.messages}`)
            const scrollCond = msgsContainer.scrollTop == msgsContainer.scrollHeight - msgsContainer.clientHeight

            const files = msg.message.message.files
            if (files) {
                // convert array buffer files to base64
                for (let i = 0; i < files.length; i++) {
                    files[i].data = Buffer.from(files[i].data, 'binary').toString('base64')
                }
            }
            const grpMsgs = messagesRef.current.find(grp => grp.id === msg.groupId)
            let newMsgsObj
            if (grpMsgs) {
                const newMsgs = grpMsgs.messages.concat([msg.message])
                newMsgsObj = [{ messages: newMsgs, id: msg.groupId }].concat(messagesRef.current.filter(grp => grp.id !== msg.groupId))
            } else {
                newMsgsObj = [{ messages: [msg.message], id: msg.groupId }].concat(messagesRef.current.filter(grp => grp.id !== msg.groupId))
            }
            setMessages(newMsgsObj)

            // if the message is in the current group and the chat is scrolled to the bottom or if the message is from the user
            if ((currentGroup.id == msg.groupId && scrollCond) || msg.message.author.uid == user.uid) {
                scrollMessagesDiv()
            }
        })
        socket.on('messageDelete-client', (data) => {
            const groupID = data.groupId
            const messageID = data.messageId
            setMessages(messagesRef.current.map(grp => {
                if (grp.id == groupID) {
                    grp.messages = grp.messages.filter(msg => msg.id != messageID)
                }
                return grp
            }))
        })
        socket.on('messageEdit-client', (data) => {
            const groupID = data.groupId
            const messageID = data.messageId
            const newMessage = data.newMessage

            setMessages(messagesRef.current.map(grp => {
                if (grp.id == groupID) {
                    grp.messages = grp.messages.map(msg => {
                        if (msg.id == messageID) {
                            msg.message.content = newMessage
                            msg.edited = true
                        }
                        return msg
                    })
                }
                return grp
            }))
        })
    }, [messages.length > 0])

    function handleFileInput(inputFiles) {
        const files = [...attachedFiles, ...inputFiles]
        const totalSizeBytes = (files.reduce((acc, file) => {
            return acc + file.size
        }, 0))
        if (totalSizeBytes > MAX_FILE_SIZE_BYTES) {
            setNotificationState({ state: 'error', data: { message: `Max File Size is ${formatBytes(MAX_FILE_SIZE_BYTES)}, your file(s) total ${formatBytes(totalSizeBytes)}` } })
            setAttachedFiles([])
        } else if (files.length > 5) {
            setNotificationState({ state: 'error', data: { message: `Max File Count is 5, your file(s) total ${files.length}` } })
        } else {
            function readFileAsText(file) {
                return new Promise(function (resolve, reject) {
                    let fr = new FileReader();
                    fr.onloadend = function () {
                        resolve(fr.result);
                    };
                    fr.onerror = function () {
                        reject(fr);
                    };
                    fr.readAsDataURL(file);
                });
            }
            const readers = []
            const unreadFiles = [...inputFiles]
            for (let i = 0; i < files.length; i++) {
                readers.push(readFileAsText(unreadFiles[i]))
            }

            Promise.allSettled(readers).then(async (results) => {
                for (let i = 0; i < results.length; i++) {
                    if (results[i].status === 'fulfilled') {
                        setAttachedFiles([...attachedFilesRef.current, { base64: results[i].value, name: unreadFiles[i].name, mimeType: unreadFiles[i].type, blob: unreadFiles[i] }])
                    }
                }
            })
        }
    }

    // drag and drop states
    const [dragState, setDragState] = useState(false)
    const [dragTransitioning, setDragTransitioning] = useState(false)
    const [dragFileCount, setDragFileCount] = useState(['0'])
    const mainChatRef = useRef(null)

    return (
        <div className={chatStyles.main} ref={mainChatRef}
            onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation()

                if (!e.dataTransfer.types.includes('Files')) return

                setDragTransitioning(true)
                setTimeout(function () {
                    setDragTransitioning(false)
                    setDragState(true)
                }, 1);
            }}
            onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation()

                if (!dragTransitioning) {
                    setDragState(false)
                }

                if (!e.dataTransfer.types.includes('Files')) return
            }}
            onDragOver={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (e.dataTransfer.items.length !== dragFileCount.length) setDragFileCount(new Array(e.dataTransfer.items.length).fill('0'))
            }}
            onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation()
                setDragState(false)

                if (e.dataTransfer.items) {
                    const items = [...e.dataTransfer.items]
                    handleFileInput(items.filter(i => {
                        if (i.getAsFile() && i.kind === 'file') return i.getAsFile()
                    }))
                }
            }}
        >
            {/* messages display */}
            <div className={chatStyles.messages}
                // scrolling for loading more messages
                onScroll={(e) => {
                    const scrollTop = e.target.scrollTop
                    const scrollHeight = e.target.scrollHeight
                    const clientHeight = e.target.clientHeight

                    // show button to scroll back to bottom
                    if (scrollTop < scrollHeight - (clientHeight * 10)) {
                        setScrollButton(true)
                    } else {
                        setScrollButton(false)
                    }

                    // if max messages, dont try to load more
                    if (maxMessages.includes(currentGroup.id)) return

                    // load more messages
                    if (scrollTop <= (scrollHeight - clientHeight) * 0.3 && !maxMessages.includes(currentGroup.id) && !msgsLoading.includes(currentGroup.id)) {
                        setMsgsLoading([currentGroup.id].concat(msgsLoading))
                    }
                }}
            >
                {
                    msgsLoading.includes(currentGroup.id) && messages.find(grp => grp.id === currentGroup.id) ?
                        <div className={chatStyles.msgsLoading}>
                            <Spinner width={'40px'} height={'40px'} color={SPINNER_COLOR} thickness={'5px'} />
                        </div> : null
                }
                {
                    messagesRef.current.find(grp => grp.id === currentGroup.id) ?
                        messagesRef.current.find(grp => grp.id === currentGroup.id).messages.map(message => {
                            return (
                                <Message key={message.id} message={message} user={user} socket={socket} ctxMenu={ctxMenu} ctxMenuPos={ctxMenuPos} ctxMenuData={ctxMenuData} currentGroup={currentGroup} setNotificationState={setNotificationState} />
                            )
                        }) :
                        <div className={chatStyles.msgsLoading}>
                            <Spinner width={'40px'} height={'40px'} color={SPINNER_COLOR} thickness={'5px'} />
                        </div>
                }
            </div>
            {/* scroll down button */}
            <div className={chatStyles.scrollContainer} style={{ opacity: scrollButton ? '' : '0', pointerEvents: scrollButton ? '' : 'none' }} onClick={
                (e) => {
                    const msgsContainer = document.querySelector(`.${chatStyles.messages}`)
                    msgsContainer.scrollTo({ top: msgsContainer.scrollHeight, behavior: 'smooth' })
                }
            }>
                <span className={chatStyles.overflowButton} title={"Scroll To Bottom"}>keyboard_double_arrow_down</span>
            </div>
            {/* message part */}
            {/* images */}
            {
                attachedFiles.length > 0 || dragState ?
                    <div className={fileStyles.attachedFilesContainer}>
                        {
                            attachedFiles.map((value, index) => {
                                const { base64, name } = value
                                if (!base64) return null
                                const mimeType = base64.split(',')[0].split(';')[0].split(':')[1]
                                const data = base64.split(',')[1]
                                const fileSize = data ? formatBytes((data * (3 / 4)) - (data.endsWith('==') ? 2 : 1)) : 0

                                value.id = index // set id for each file

                                return <AttachedFileView key={`${index}::${base64}`} id={index} mimeType={mimeType} name={name} fileSize={fileSize} data={base64} attachedFiles={attachedFiles} setAttachedFiles={setAttachedFiles} setNotificationState={setNotificationState} />
                            })
                        }
                        {
                            dragState ?
                                dragFileCount.map((v, i) => {
                                    return <div key={i} className={`${fileStyles.attachedFileViewContainer} ${fileStyles.attachedFileViewContainerEmpty}`}></div>
                                })
                                :
                                null
                        }
                    </div>
                    : null
            }
            {/* message input */}
            <div className={chatStyles.messageInputContainer}>
                <form className={chatStyles.messageInputForm} encType={"multipart/form-data"}
                    onSubmit={async (e) => {
                        e.preventDefault()
                        const msgInput = document.querySelector('[data-name="content"]')
                        const msgInputContainer = msgInput.parentElement
                        const msgInputParent = msgInputContainer.parentElement
                        const fileInput = document.querySelector('[data-name="files"]')
                        // get formdata
                        const formFiles = attachedFilesRef.current.map(i => {
                            return {
                                name: i.name,
                                data: i.blob,
                                mimeType: i.blob.type
                            }
                        })
                        const formDataObj = {
                            files: formFiles,
                            content: msgInput.innerText
                        }

                        // remove empty values
                        if (formDataObj.files && formDataObj.files.size === 0) formDataObj.files = []
                        // confirm message length
                        if (formDataObj.content.length > MAX_MESSAGE_LEN) {
                            return setNotificationState({ state: 'error', data: { message: 'Your message is too long!' } })
                        } else if (formDataObj.content.trim().length === 0 && formDataObj.files.length === 0) {
                            return
                        }
                        formDataObj.content = formDataObj.content.trim()

                        // send message
                        await socket.emit('messageCreate-server', { accessToken: jsCookie.get('accessToken'), groupId: currentGroup.id, message: formDataObj })
                        // reset form and images
                        setAttachedFiles([])
                        fileInput.value = ''
                        msgInput.innerText = ''
                        msgInput.style.height = null
                        msgInputContainer.style.height = null
                        msgInputParent.dataset.length = '0'
                        msgInputParent.dataset.overflow = ''
                    }}
                >
                    <div className={chatStyles.messageButtons}>
                        <input data-name={'files'} id={'file-upload'} type={"file"} style={{ display: 'none' }} multiple
                            onInput={(e) => {
                                handleFileInput(e.target.files)
                                e.target.value = '' // reset files in this input so that multiple of the same file can be uploaded and you can upload multiple times
                            }}
                        />
                        <label htmlFor={"file-upload"} className={chatStyles.fileUpload}>
                            file_upload
                        </label>
                        <button type={"submit"} className={chatStyles.messageInputSubmit} data-messagesubmit>send</button>
                    </div>

                    <div className={chatStyles.messageTextContainer} data-length="0" data-overflow=""
                        onClick={(e) => {
                            document.querySelector('[role="textbox"]').focus()
                        }}
                    >
                        <div className={chatStyles.contentEditableMessageAreaContainer}>
                            <div data-name={'content'} className={chatStyles.contentEditableMessageArea} contentEditable={true} role="textbox" data-placeholder={`Message ${currentGroup.members.length == 2 ? '@' : ''}${currentGroup.name}`}
                                onPaste={(e) => {
                                    e.preventDefault()
                                    handleFileInput(e.clipboardData.files)
                                    const text = e.clipboardData.getData('text/plain')
                                    document.execCommand('insertText', false, text)
                                    e.target.scrollTop = e.target.scrollHeight * 1000
                                }}
                                onInput={(e) => { // validating characters length
                                    const text = e.target.innerText
                                    const parent = e.target.parentElement
                                    const mainCont = parent.parentElement

                                    // scroll height
                                    e.target.style.height = 'auto';
                                    e.target.parentElement.style.height = 'auto'
                                    const newHeight = text.length == 0 ? null : (e.target.scrollHeight + 2) + 'px';
                                    e.target.style.height = newHeight
                                    e.target.parentElement.style.height = newHeight

                                    // validating length
                                    if (MAX_MESSAGE_LEN - text.length < 0) {
                                        mainCont.dataset.length = MAX_MESSAGE_LEN - text.length
                                        mainCont.dataset.overflow = 'error'
                                    } else if (MAX_MESSAGE_LEN - text.length <= 500) {
                                        mainCont.dataset.length = text.length
                                        mainCont.dataset.overflow = 'warn'
                                    } else {
                                        mainCont.dataset.length = text.length
                                        mainCont.dataset.overflow = ''
                                    }

                                }}
                                onKeyDown={(e) => {
                                    if (e.key == 'Enter' && !e.shiftKey) {
                                        e.preventDefault()
                                        document.querySelector('[data-messagesubmit="true"]').click() // submit form
                                        return
                                    }
                                }}
                            >
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}
export function Message({ message, user, currentGroup, socket, ctxMenu, ctxMenuPos, ctxMenuData, setNotificationState }) {
    const [contextMenu, setContextMenu] = ctxMenu
    const [contextMenuPos, setContextMenuPos] = ctxMenuPos
    const [contextMenuData, setContextMenuData] = ctxMenuData

    const messageEditDivRef = useRef(null)

    const [messageEdit, setMessageEdit] = useState(false) // if message is being edited currently

    useEffect(() => {
        if (messageEdit) {
            messageEditDivRef.current.focus()
        }
    }, [messageEdit])

    function handleContextMenuFile(e, filedata, filename, filesize, mimeType, dimensions) {
        e.preventDefault()
        const path = e.nativeEvent.composedPath()
        const mainTarget = path.find(p => p.dataset && p.dataset.contexttype)
        const contextType = mainTarget ? mainTarget.dataset.contexttype : 'NONE'

        if (contextType == 'MENU') return // if context menu is right-clicked, do nothing

        const clientX = e.clientX
        const clientY = e.clientY

        setContextMenu(contextType)
        setContextMenuPos({ x: clientX, y: clientY })
        setContextMenuData({ filedata, filename, filesize, mimeType, dimensions })
    }
    function handleContextMenuMessage(e, message, x, y) {
        e.preventDefault()
        const path = e.nativeEvent.composedPath()
        const mainTarget = path.find(p => p.dataset && p.dataset.contexttype)
        const contextType = mainTarget ? mainTarget.dataset.contexttype : 'NONE'

        // if context menu is right-clicked, do nothing. If file is right-clicked, let listener on the files container handle it
        if (contextType == 'MENU' || contextType == 'FILE') return


        setContextMenu(contextType)
        setContextMenuPos({ x, y })
        setContextMenuData({ id: message.id, target: mainTarget, setMessageEdit })
    }

    return (
        <div id={message.id} data-contexttype="MESSAGE" className={chatStyles.message} data-timestamp={message.createdAt} data-sender={message.author.uid == user.uid}
            onContextMenu={(e) => {
                const clientX = e.clientX
                const clientY = e.clientY
                handleContextMenuMessage(e, message, clientX, clientY)
            }}
        >
            <img data-contexttype="USER" className={chatStyles.messageIcon} src={message.author.icon} loading={"lazy"} alt={`${message.author.username}'s icon`} />

            <div className={chatStyles.messageContainer}>
                <div className={chatStyles.messageHeader}>
                    <h4 className={chatStyles.messageAuthor} data-contexttype="USER">{message.author.username}</h4>
                    <div className={chatStyles.messageInfo}>
                        <div className={chatStyles.messageInfoSect}>
                            <span className={chatStyles.messageTS} title={moment(message.createdAt).format('llll')}>{moment(message.createdAt).fromNow()}</span>
                            <span className={chatStyles.messageEdited} title={"This message was edited."}>{message.edited ? '(edited)' : ''}</span>
                        </div>
                        <span className={chatStyles.messageOptions} data-contexttype={"MESSAGE"} data-type={'OPTIONS'}
                            onClick={(e) => {
                                const rect = e.target.getBoundingClientRect()
                                const clientX = rect.x - 8
                                const clientY = rect.y + rect.height / 2
                                handleContextMenuMessage(e, message, clientX, clientY)
                            }}
                        >more_horiz</span>
                    </div>
                </div>
                <div className={chatStyles.messageBody} >
                    <div className={chatStyles.messageContentContainer} >
                        {
                            !messageEdit ? (
                                <div className={chatStyles.messageContentMarkdown} data-message-content>{message.message.content}</div>
                            ) :
                                <div>
                                    <div className={chatStyles.messageContentEditable} contentEditable data-message-content ref={messageEditDivRef} suppressContentEditableWarning={true}
                                    // onInput={(e) => { // TODO: FIX THIS, UNABLE TO GET PROPER CARET POSITION WITH CONTENTEDITABLE BECAUSE MULTIPLE NODES CAN BE CREATED
                                    //     const caretPos = window.getSelection().anchorOffset
                                    //     const caretEl = window.getSelection().anchorNode

                                    //     // format text
                                    //     const text = e.target.innerText
                                    //     const formattedText = formatMessageInput(text, 100)
                                    //     e.target.innerHTML = formattedText
                                    //     // set cursor to last known position
                                    //     const range = document.createRange()
                                    //     const sel = window.getSelection()

                                    //     range.setStart(caretEl, caretPos)
                                    //     range.collapse(true)

                                    //     sel.removeAllRanges()
                                    //     sel.addRange(range)
                                    // }}
                                    >
                                        {message.message.content}
                                    </div>
                                    <div className={chatStyles.messageContentEditableInfo}>
                                        <div>
                                            <kbd onClick={() => {
                                                setMessageEdit(false)
                                            }}>
                                                esc
                                            </kbd>
                                            &nbsp;
                                            to cancel
                                            &nbsp;
                                        </div>
                                        &#8226;
                                        <div>
                                            &nbsp;
                                            <kbd onClick={() => {
                                                const newText = messageEditDivRef.current.innerText
                                                setMessageEdit(false)
                                                if (message.message.content == newText) return
                                                socket.emit('messageEdit-server', { groupId: currentGroup.id, messageId: message.id, newMessage: newText, accessToken: jsCookie.get('accessToken') }, (res) => {
                                                    if (!res) console.log('error, unable to edit message')
                                                    setNotificationState({ state: 'warning', data: { message: 'Message Edited' } })
                                                })
                                            }}>
                                                enter
                                            </kbd>
                                            &nbsp;
                                            to save
                                        </div>
                                    </div>
                                </div>
                        }
                    </div>
                    <div className={fileStyles.messageFiles}>
                        {
                            message.message.files.map((fileInfo, i) => {
                                const data = Buffer.isBuffer(fileInfo.data) ? fileInfo.data.toString('base64') : fileInfo.data
                                const fileSize = data ? calculateFileSize(data) : 0
                                const name = fileInfo.name

                                const mimeType = fileInfo.mimeType
                                const generalType = mimeType.split('/')[0]
                                const specificType = mimeType.split('/')[1]
                                switch (true) {
                                    case generalType === 'image' && specificType === 'apng':
                                    case generalType === 'image' && specificType === 'avif':
                                    case generalType === 'image' && specificType === 'jpeg':
                                    case generalType === 'image' && specificType === 'png':
                                    case generalType === 'image' && specificType === 'svg':
                                    case generalType === 'image' && specificType === 'webp':
                                    case generalType === 'image' && specificType === 'gif':
                                        return <ImageFileView
                                            key={`${i} ${data}`}
                                            alt={name}
                                            data={data}
                                            name={name}
                                            mimeType={mimeType}
                                            fileSize={fileSize}
                                            onContextMenu={(e, dimensions) => handleContextMenuFile(e, `data:${mimeType};base64,${data}`, name, fileSize, mimeType, dimensions)}
                                        />
                                    case generalType === 'audio' && specificType === 'ogg':
                                    case generalType === 'audio' && specificType === 'mp3':
                                    case generalType === 'audio' && specificType === 'wav':
                                    case generalType === 'audio' && specificType === 'mpeg':
                                        return <AudioFileView
                                            key={`${i} ${data}`}
                                            mimeType={mimeType}
                                            name={name}
                                            fileSize={fileSize}
                                            data={`data:${mimeType};base64,${data}`}
                                            onContextMenu={(e) => handleContextMenuFile(e, `data:${mimeType};base64,${data}`, name, fileSize, mimeType)}
                                        />
                                    case generalType === 'video' && specificType === 'ogg':
                                    case generalType === 'video' && specificType === 'mp4':
                                    case generalType === 'video' && specificType === 'webm':
                                        // find aspect ratio of video here and add it to the contextmenu listener below
                                        return <VideoFileView
                                            key={`${i} ${data}`}
                                            name={name}
                                            mimeType={mimeType}
                                            fileSize={fileSize}
                                            data={`data:${mimeType};base64,${data}`}
                                            onContextMenu={(e, dimensions) => handleContextMenuFile(e, `data:${mimeType};base64,${data}`, name, fileSize, mimeType, dimensions)}
                                        />
                                    case generalType === 'text':
                                        return <TextFileView
                                            key={`${i} ${data}`}
                                            data={data}
                                            fileSize={fileSize}
                                            mimeType={mimeType}
                                            name={name}
                                            onContextMenu={(e) => handleContextMenuFile(e, `data:${mimeType};base64,${data}`, name, fileSize, mimeType)}
                                        />
                                    default:
                                        return <DefaultFileView
                                            key={`${i} ${data}`}
                                            mimeType={mimeType}
                                            name={name}
                                            fileSize={fileSize}
                                            data={`data:${mimeType};base64,${data}`}
                                            onContextMenu={(e) => handleContextMenuFile(e, `data:${mimeType};base64,${data}`, name, fileSize, mimeType)}
                                        />
                                }
                            })
                        }
                    </div>
                </div>
            </div>
        </div>
    )
}

// Extra
export function NoGroupSelected() {
    return (
        <div style={{ width: '100%', height: '100%', display: "flex", justifyContent: "center", alignItems: "center", fontSize: '40px', color: 'var(--font-color)' }}>
            Select A Group
        </div>
    )
}
export function PageLoading() {
    return (
        <div style={{ width: '100%', height: '90%', display: "flex", justifyContent: "center", alignItems: "center", position: 'absolute' }}>
            <Spinner color={SPINNER_COLOR} height={'80px'} width={'80px'} thickness={'8px'} animationDuration={'1s'} animationTimingFunction={'cubic-bezier(0.62, 0.27, 0.08, 0.96)'} />
        </div>
    )
}
