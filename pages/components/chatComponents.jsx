// Styles
import homeStyles from "../../styles/Home.module.css";
import chatStyles from "../../styles/ChatStyles/ChatComponentStyles.module.css";
import groupStyles from "../../styles/ChatStyles/GroupComponentStyles.module.css";
import friendStyles from "../../styles/ChatStyles/FriendComponentsStyles.module.css";
import videoStyles from "../../styles/FileViews/VideoOverlay.module.css";
import audioStyles from "../../styles/FileViews/AudioOverlay.module.css";
import fileStyles from "../../styles/FileViews/FileViews.module.css";
import contextMenuStyles from "../../styles/ChatStyles/ContextMenuStyles.module.css";
import modalStyles from "../../styles/ChatStyles/ModalComponentStyles.module.css";
// Util + React Hooks + Components
import { useState, useEffect, useRef } from "react";
import { useDebounce, shortenName, formatBytes, shortenFileName, calculateFileSize, downloadBase64File, formatDuration, gcd, formatMessageInput } from "./util";
import { Spinner } from "./formComponents";
// Util Packages
import jsCookie from "js-cookie";
import moment from "moment";

const SPINNER_COLOR = '#2e8283'
const MAX_FILE_SIZE_BYTES = 50 * (1024 * 1024); // 50 MB in bytes
const MAX_MESSAGE_LEN = 6000
const MAX_FILE_NAME_LEN = 100
const EXTENSIONS = [
    'apng',
    'avif',
    'jpeg',
    'png',
    'svg',
    'webp',
    'gif',
    'ogg',
    'mp3',
    'wav',
    'mpeg',
    'mp4',
    'webm',
    'pdf',
    'doc',
    'docx',
    'xls',
    'xlsx',
    'ppt',
    'pptx',
    'text',
    'rtf',
    'csv',
    'zip',
    'rar',
    '7z',
]

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
            <div className={groupStyles.groupsContainer} style={{ opacity: `${menuState ? '0' : '1'}` }}>
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
                        <div className={groupStyles.friends} style={{ opacity: menuState ? '0' : '1', width: `${menuState ? '0px' : '100%'}` }}>
                            <div className={groupStyles.friendsHeader}>
                                <form className={groupStyles.friendsHeaderForm}
                                    onSubmit={(e) => {
                                        e.preventDefault()
                                        const formData = new FormData(e.target)
                                        const friend = formData.get('friends_search')
                                        e.target.reset()
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
                            <div className={groupStyles.friendsContainer}>
                                {
                                    friendsTabState.toLowerCase() == 'current' ?
                                        user.friends.current.length > 0 ?
                                            user.friends.current.map(friend => {
                                                return (
                                                    // friend container
                                                    <CurrentFriend key={friend.uid} friend={friend} currentGroup={currentGroup} ctxMenu={ctxMenu} ctxMenuPos={ctxMenuPos} ctxMenuData={ctxMenuData} />
                                                )
                                            }) :
                                            null
                                        :
                                        friendsTabState.toLowerCase() == 'pending' ?
                                            user.friends.pending.length > 0 ?
                                                user.friends.pending.map(friend => {
                                                    return (
                                                        // friend container
                                                        <PendingFriend key={friend.uid} friend={friend} currentGroup={currentGroup} ctxMenu={ctxMenu} ctxMenuPos={ctxMenuPos} ctxMenuData={ctxMenuData} />
                                                    )
                                                }) :
                                                null
                                            :
                                            friendsTabState.toLowerCase() == 'outgoing' ?
                                                user.friends.outgoing.length > 0 ?
                                                    user.friends.outgoing.map((friend) => {
                                                        return (
                                                            // friend container
                                                            <OutgoingFriend key={friend.uid} friend={friend} currentGroup={currentGroup} ctxMenu={ctxMenu} ctxMenuPos={ctxMenuPos} ctxMenuData={ctxMenuData} />
                                                        )
                                                    }) :
                                                    null
                                                :
                                                null
                                }
                            </div>
                        </div>
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
export function CurrentFriend({ friend, currentGroup, ctxMenu, ctxMenuPos, ctxMenuData }) {
    const [contextMenu, setContextMenu] = ctxMenu
    const [contextMenuPos, setContextMenuPos] = ctxMenuPos
    const [contextMenuData, setContextMenuData] = ctxMenuData

    return (
        <div className={friendStyles.currentFriendContainer} data-contexttype={'FRIEND'}
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
                setContextMenuData({ friendData: friend })
            }}
        >
            {friend.username}
        </div>
    )
}
export function PendingFriend({ friend, currentGroup, ctxMenu, ctxMenuPos, ctxMenuData }) {
    return <>{friend.username}</>
}

export function OutgoingFriend({ friend, currentGroup, ctxMenu, ctxMenuPos, ctxMenuData }) {
    return <>{friend.username}</>
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
                {
                    group.icon ? <img title={`${group.name}'s icon`} src={`/api/v1/data/images/${group.icon}`} loading={"lazy"} className={groupStyles.groupImage} alt={`${group.name}'s icon`} /> :
                        <img title={`${group.name}'s icon`} src={`/api/v1/data/images/default`} loading={"lazy"} className={groupStyles.groupImage} alt={`${group.name}'s icon`} />
                }
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
                    handleFileInput(items.map(i => {
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
            <img data-contexttype="USER" className={chatStyles.messageIcon} src={`/api/v1/data/images/${message.author.icon}`} loading={"lazy"} alt={`${message.author.username}'s icon`} />

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

// Message File Views
export function TextFileView({ name, mimeType, data, fileSize, onContextMenu }) {
    const [textFileState, setTextFileState] = useState(false)

    return (
        <pre data-contexttype="FILE" key={data} wrap={"true"} className={fileStyles.messageFile} onContextMenu={onContextMenu}>
            <div className={fileStyles.preHeader}>
                <div className={fileStyles.preTitle}>
                    <div style={{ fontSize: '15px' }}>{shortenFileName(name, 10)}</div>
                    <div className={fileStyles.preButtons}>
                        <div className={fileStyles.preButton} onClick={() => {
                            setTextFileState(!textFileState)
                        }}>{textFileState ? 'unfold_less' : 'unfold_more'}</div>
                        <div className={fileStyles.preButton} onClick={() => downloadBase64File(`data:${mimeType};base64,${data}`, name)}>file_download</div>
                        <div className={fileStyles.preFileSize}>{fileSize}</div>
                    </div>
                </div>
                <span className={fileStyles.divider}></span>
            </div>
            {
                textFileState ?
                    Buffer.from(data, 'base64').toString('utf-8') :
                    null
            }
        </pre>
    )
}
export function VideoFileView({ data, name, mimeType, fileSize, onContextMenu }) {
    const PLAYBACK_SPEEDS = ['0.25', '0.5', '0.75', '1', '1.25', '1.5', '1.75', '2']
    const [playing, _setPlaying] = useState(false) // true = playing, false = paused
    const [fullscreen, _setFullscreen] = useState(false) // true = fullscreen, false = not fullscreen
    const [volume, _setVolume] = useState(1) // 0 to 1
    const [muted, _setMuted] = useState(true)
    const [playbackSpeed, _setPlaybackSpeed] = useState('1')
    const [currentTime, _setCurrentTime] = useState(0) // in seconds
    const [currentTimeInternal, _setCurrentTimeInternal] = useState(0) // in seconds
    const [duration, _setDuration] = useState(0) // in seconds
    const [pbSpeedMenuState, setPbSpeedMenuState] = useState(false)
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

    const mutedRef = useRef(muted)
    const volumeRef = useRef(volume)
    const playingRef = useRef(playing)
    const fullscreenRef = useRef(fullscreen)
    const playbackSpeedRef = useRef(playbackSpeed)
    const currentTimeRef = useRef(currentTime)
    const currentTimeRefInternal = useRef(currentTimeInternal)
    const durationRef = useRef(duration)

    const setFullscreen = (value) => {
        fullscreenRef.current = value
        _setFullscreen(value)
    }
    const setMuted = (value) => {
        mutedRef.current = value
        _setMuted(value)
    }
    const setVolume = (value) => {
        volumeRef.current = value
        _setVolume(value)
    }
    const setPlaying = (value) => {
        playingRef.current = value
        _setPlaying(value)
    }
    const setPlaybackSpeed = (value) => {
        playbackSpeedRef.current = value
        _setPlaybackSpeed(value)
    }
    const setCurrentTime = (value) => {
        currentTimeRefInternal.current = value
        currentTimeRef.current = value
        _setCurrentTime(value)
    }
    const setCurrentTimeInternal = (value) => { // changed by video element, uses different state to prevent infinite loop with useEffect below
        currentTimeRefInternal.current = value
        currentTimeRef.current = value
        _setCurrentTimeInternal(value)
    }
    const setDuration = (value) => {
        durationRef.current = value
        _setDuration(value)
    }

    const videoRef = useRef(null)
    const videoContainerRef = useRef(null)
    const pbSpeedElementRef = useRef(null)

    useEffect(async () => {
        playing ? await videoRef.current.play() : await videoRef.current.pause()
    }, [playing])
    useEffect(() => {
        if (document.fullscreenElement == null && fullscreenRef.current) {
            videoContainerRef.current.requestFullscreen()
        } else if (document.fullscreenElement) {
            document.exitFullscreen()
            setFullscreen(false)
        }

        return () => {
            if (document.fullscreenElement) {
                document.exitFullscreen()
                setFullscreen(false)
            }
        }
    }, [fullscreen])
    useEffect(() => {
        videoRef.current.volume = volume
    }, [volume])
    useEffect(() => {
        videoRef.current.muted = muted
    }, [muted])
    useEffect(() => {
        videoRef.current.currentTime = currentTime
    }, [currentTime])
    useEffect(() => {
        videoRef.current.playbackRate = parseFloat(playbackSpeed)
    }, [playbackSpeed])

    useEffect(() => {
        const video = document.createElement('video')
        video.src = data
        video.onloadedmetadata = () => {
            setDimensions({ width: video.videoWidth, height: video.videoHeight })
        }

        function handleClickEvent(e) {
            if (!e.composedPath().includes(pbSpeedElementRef.current)) {
                setPbSpeedMenuState(false)
            }
        }

        document.addEventListener('click', handleClickEvent)

        return () => { // cleanup event listeners
            document.removeEventListener('click', handleClickEvent)
        }
    }, [])
    return (
        <div data-contexttype="FILE" className={videoStyles.videoContainer} data-playing={playing} data-fullscreen={fullscreen} ref={videoContainerRef}
            onContextMenu={(e) => {
                onContextMenu(e, dimensions)
            }}
        >
            <div className={videoStyles.videoInformationContainer}>
                <div className={videoStyles.videoInformation}>
                    <div className={videoStyles.videoHeader}>
                        <div className={videoStyles.videoFileName} title={name}>{shortenFileName(name, 20)}</div>
                        <div className={videoStyles.videoFileSize} title={fileSize}>{fileSize}</div>
                    </div>
                    <div className={videoStyles.videoDownload} title={`Download ${name}`} onClick={() => downloadBase64File(data, name)}>file_download</div>
                </div>
            </div>
            <div className={videoStyles.videoControlsContainer}>
                <div className={videoStyles.timelineContainer}>
                    <input className={videoStyles.timeline} step={'any'} type="range" min="0" max={durationRef.current} value={currentTimeRef.current} onChange={(e) => setCurrentTime(e.target.value)} />
                </div>
                <div className={videoStyles.controls}>
                    <button className={videoStyles.playPauseBtn} onClick={() => setPlaying(!playing)}>
                        {
                            playing ?
                                <svg viewBox="0 0 24 24">
                                    <path fill="currentColor" d="M14,19H18V5H14M6,19H10V5H6V19Z" />
                                </svg> :
                                <svg viewBox="0 0 24 24">
                                    <path fill="currentColor" d="M8,5.14V19.14L19,12.14L8,5.14Z" />
                                </svg>
                        }
                    </button>
                    <div className={videoStyles.volumeContainer}>
                        <button className={videoStyles.muteBtn} onClick={() => setMuted(!muted)}>
                            {
                                muted || volume == 0 ?
                                    <svg viewBox="0 0 24 24">
                                        <path fill="currentColor" d="M12,4L9.91,6.09L12,8.18M4.27,3L3,4.27L7.73,9H3V15H7L12,20V13.27L16.25,17.53C15.58,18.04 14.83,18.46 14,18.7V20.77C15.38,20.45 16.63,19.82 17.68,18.96L19.73,21L21,19.73L12,10.73M19,12C19,12.94 18.8,13.82 18.46,14.64L19.97,16.15C20.62,14.91 21,13.5 21,12C21,7.72 18,4.14 14,3.23V5.29C16.89,6.15 19,8.83 19,12M16.5,12C16.5,10.23 15.5,8.71 14,7.97V10.18L16.45,12.63C16.5,12.43 16.5,12.21 16.5,12Z" />
                                    </svg> :
                                    (
                                        volume > .5 ?
                                            <svg viewBox="0 0 24 24">
                                                <path fill="currentColor" d="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.84 14,18.7V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z" />
                                            </svg> :
                                            <svg viewBox="0 0 24 24">
                                                <path fill="currentColor" d="M5,9V15H9L14,20V4L9,9M18.5,12C18.5,10.23 17.5,8.71 16,7.97V16C17.5,15.29 18.5,13.76 18.5,12Z" />
                                            </svg>
                                    )
                            }
                        </button>
                        <input className={videoStyles.volumeSlider} type="range" min="0" max="1" step="any" defaultValue={1} onInput={(e) => {
                            setVolume(e.target.value)
                            if (muted) setMuted(false)
                        }} />
                    </div>
                    <div className={videoStyles.durationContainer}>
                        <div className={videoStyles.currentTime}>{formatDuration(currentTimeRef.current)}</div>
                        /
                        <div className={videoStyles.totalTime}>{formatDuration(duration)}</div>
                    </div>
                    <div ref={pbSpeedElementRef} className={videoStyles.playBackSpeedContainer} onClick={
                        () => setPbSpeedMenuState(!pbSpeedMenuState)
                    }>
                        {/* show menu of all playback speeds and highlight the one that is currently selected */}
                        <ul className={videoStyles.playBackSpeeds} data-open={pbSpeedMenuState}>
                            {
                                PLAYBACK_SPEEDS.map(speed => {
                                    return <li key={speed} data-current={speed == playbackSpeedRef.current} className={videoStyles.playBackSpeed} onClick={() => setPlaybackSpeed(speed)}>{speed}x</li>
                                })
                            }
                        </ul>
                        <div className={videoStyles.currentPlayBackSpeed}>{playbackSpeed}x</div>
                    </div>
                    <button className={videoStyles.fullScreenBtn} onClick={(e) => setFullscreen(!fullscreen)}>
                        {
                            fullscreen ?
                                <svg viewBox="0 0 24 24">
                                    <path fill="currentColor" d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                                </svg> :
                                <svg viewBox="0 0 24 24">
                                    <path fill="currentColor" d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                                </svg>
                        }
                    </button>
                </div>
            </div>
            <video preload={"auto"} key={data} src={data} className={videoStyles.video} ref={videoRef}
                onClick={() => setPlaying(!playing)}
                onLoadedData={(e) => setDuration(e.target.duration)}
                onTimeUpdate={(e) => setCurrentTimeInternal(e.target.currentTime)}
            ></video>
        </div>
    )
}
export function AudioFileView({ data, name, mimeType, fileSize, onContextMenu }) {
    const PLAYBACK_SPEEDS = ['0.25', '0.5', '0.75', '1', '1.25', '1.5', '1.75', '2']
    const [playing, _setPlaying] = useState(false) // true = playing, false = paused
    const [volume, _setVolume] = useState(1) // 0 - 1
    const [muted, _setMuted] = useState(true)
    const [playbackSpeed, _setPlaybackSpeed] = useState('1')
    const [currentTime, _setCurrentTime] = useState(0) // in seconds
    const [currentTimeInternal, _setCurrentTimeInternal] = useState(0) // in seconds
    const [duration, _setDuration] = useState(0) // in seconds
    const [pbSpeedMenuState, setPbSpeedMenuState] = useState(false)

    const mutedRef = useRef(muted)
    const volumeRef = useRef(volume)
    const playingRef = useRef(playing)
    const playbackSpeedRef = useRef(playbackSpeed)
    const currentTimeRef = useRef(currentTime)
    const currentTimeRefInternal = useRef(currentTimeInternal)
    const durationRef = useRef(duration)

    const setMuted = (value) => {
        mutedRef.current = value
        _setMuted(value)
    }
    const setVolume = (value) => {
        volumeRef.current = value
        _setVolume(value)
    }
    const setPlaying = (value) => {
        playingRef.current = value
        _setPlaying(value)
    }
    const setPlaybackSpeed = (value) => {
        playbackSpeedRef.current = value
        _setPlaybackSpeed(value)
    }
    const setCurrentTime = (value) => {
        currentTimeRef.current = value
        _setCurrentTime(value)
    }
    const setCurrentTimeInternal = (value) => {
        currentTimeRefInternal.current = value
        currentTimeRef.current = value
        _setCurrentTimeInternal(value)
    }
    const setDuration = (value) => {
        durationRef.current = value
        _setDuration(value)
    }

    const audioRef = useRef(null)
    const audioContainerRef = useRef(null)
    const pbSpeedElementRef = useRef(null)

    useEffect(() => {
        playing ? audioRef.current.play() : audioRef.current.pause()
    }, [playing])
    useEffect(() => {
        audioRef.current.volume = volume
    }, [volume])
    useEffect(() => {
        audioRef.current.muted = muted
    }, [muted])
    useEffect(() => {
        audioRef.current.currentTime = currentTime
    }, [currentTime])
    useEffect(() => {
        audioRef.current.playbackRate = parseFloat(playbackSpeed)
    }, [playbackSpeed])
    useEffect(() => {
        function handleClickEvent(e) {
            if (!e.composedPath().includes(pbSpeedElementRef.current)) {
                setPbSpeedMenuState(false)
            }
        }
        document.addEventListener('click', handleClickEvent)

        return () => { // cleanup event listener
            document.removeEventListener('click', handleClickEvent)
        }
    }, [])

    // controls: play/pause, duration and current time, timeline, volume/mute, playback speed, download
    return (
        <div data-contexttype="FILE" className={audioStyles.audioContainer} data-playing={playing} ref={audioContainerRef} onContextMenu={onContextMenu}>
            <div className={audioStyles.audioControls}>
                <button className={audioStyles.playPauseBtn} onClick={() => setPlaying(!playing)}>
                    {
                        playing ?
                            <svg viewBox="0 0 24 24">
                                <path fill="currentColor" d="M14,19H18V5H14M6,19H10V5H6V19Z" />
                            </svg> :
                            <svg viewBox="0 0 24 24">
                                <path fill="currentColor" d="M8,5.14V19.14L19,12.14L8,5.14Z" />
                            </svg>
                    }
                </button>
                <div className={audioStyles.duration}>
                    {formatDuration(currentTimeRef.current)} / {formatDuration(duration)}
                </div>
                <div className={audioStyles.timeline}>
                    <input className={audioStyles.timelineInput} type="range" min="0" max={duration} value={currentTimeRef.current} onChange={(e) => setCurrentTime(e.target.value)} />
                </div>
                <div className={audioStyles.volumeContainer}>
                    <button className={videoStyles.muteBtn} onClick={() => setMuted(!muted)}>
                        {
                            muted || volume == 0 ?
                                <svg viewBox="0 0 24 24">
                                    <path fill="currentColor" d="M12,4L9.91,6.09L12,8.18M4.27,3L3,4.27L7.73,9H3V15H7L12,20V13.27L16.25,17.53C15.58,18.04 14.83,18.46 14,18.7V20.77C15.38,20.45 16.63,19.82 17.68,18.96L19.73,21L21,19.73L12,10.73M19,12C19,12.94 18.8,13.82 18.46,14.64L19.97,16.15C20.62,14.91 21,13.5 21,12C21,7.72 18,4.14 14,3.23V5.29C16.89,6.15 19,8.83 19,12M16.5,12C16.5,10.23 15.5,8.71 14,7.97V10.18L16.45,12.63C16.5,12.43 16.5,12.21 16.5,12Z" />
                                </svg> :
                                (
                                    volume > .5 ?
                                        <svg viewBox="0 0 24 24">
                                            <path fill="currentColor" d="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.84 14,18.7V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z" />
                                        </svg> :
                                        <svg viewBox="0 0 24 24">
                                            <path fill="currentColor" d="M5,9V15H9L14,20V4L9,9M18.5,12C18.5,10.23 17.5,8.71 16,7.97V16C17.5,15.29 18.5,13.76 18.5,12Z" />
                                        </svg>
                                )
                        }
                    </button>
                    <input className={audioStyles.volumeSlider} type="range" min="0" max="1" step="any" defaultValue={1} onInput={(e) => {
                        setVolume(e.target.value)
                        if (muted) setMuted(false)
                    }} />
                </div>
                <div ref={pbSpeedElementRef} className={audioStyles.playBackSpeedContainer} onClick={
                    () => setPbSpeedMenuState(!pbSpeedMenuState)
                }>
                    {/* show menu of all playback speeds and highlight the one that is currently selected */}
                    <ul className={audioStyles.playBackSpeeds} data-open={pbSpeedMenuState}>
                        {
                            PLAYBACK_SPEEDS.map(speed => {
                                return <li key={speed} data-current={speed == playbackSpeed} className={audioStyles.playBackSpeed} onClick={() => setPlaybackSpeed(speed)}>{speed}x</li>
                            })
                        }
                    </ul>
                    <div className={audioStyles.currentPlayBackSpeed}>{playbackSpeed}x</div>
                </div>
                <div className={audioStyles.audioFileDownload} title={`Download ${name}`} onClick={(e) => {
                    downloadBase64File(data, name)
                }}>file_download</div>
            </div>
            <audio ref={audioRef} key={data} src={data}
                onLoadedData={(e) => setDuration(e.target.duration)}
                onTimeUpdate={(e) => setCurrentTimeInternal(e.target.currentTime)}
            >
            </audio>
        </div>
    )
}
export function ImageFileView({ data, name, mimeType, fileSize, onContextMenu }) {
    const MAX_DIMENSION = 300
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
    const [intrinsicDimensions, setIntrinsicDimensions] = useState({ width: 0, height: 0 })

    useEffect(() => {
        const img = new Image()
        img.src = `data:${mimeType};base64,${data}`
        img.onload = () => {
            if (img.width > MAX_DIMENSION) {
                setDimensions({
                    width: MAX_DIMENSION,
                    height: Math.floor(img.height * (MAX_DIMENSION / img.width))
                })
            } else if (img.height > MAX_DIMENSION) {
                setDimensions({
                    width: Math.floor(img.width * (MAX_DIMENSION / img.height)),
                    height: MAX_DIMENSION
                })
            } else {
                setDimensions({ width: img.width, height: img.height })
            }
            setIntrinsicDimensions({ width: img.width, height: img.height })
        }
    }, [])

    return <img
        data-contexttype="FILE"
        className={fileStyles.messageFile}
        alt={name}
        src={`data:${mimeType};base64,${data}`}
        title={name}
        onContextMenu={(e) => { onContextMenu(e, intrinsicDimensions) }}
        width={dimensions.width}
        height={dimensions.height}
    />
}
export function DefaultFileView({ data, name, mimeType, fileSize, onContextMenu }) {
    return (
        <div className={fileStyles.messageFile} onContextMenu={onContextMenu}>
            <div data-contexttype="FILE" className={fileStyles.fileViewContainer}>
                <div className={fileStyles.fileImage}>draft</div>
                <div className={fileStyles.fileInfo}>
                    <a className={fileStyles.fileName} title={name} href={data} download={name} onClick={(e) => {
                        e.preventDefault()
                        downloadBase64File(data, name)
                    }}>{shortenFileName(name, 8)}</a>
                    <div className={fileStyles.fileSize} title={fileSize}>{fileSize}</div>
                </div>
                <div className={fileStyles.fileDownload} onClick={(e) => {
                    downloadBase64File(data, name)
                }}>file_download</div>
            </div>
        </div>

    )
}
export function AttachedFileView({ id, data, name, mimeType, fileSize, onContextMenu, attachedFiles, setAttachedFiles, setNotificationState }) {
    const generalType = mimeType.split('/')[0]
    const specificType = mimeType.split('/')[1]

    const shortenedName = shortenFileName(name, 30)

    const [editState, setEditState] = useState(false)

    return (
        <div data-contexttype="FILE" className={fileStyles.attachedFileViewContainer} onContextMenu={onContextMenu}>
            <div className={fileStyles.attachmentButtons}>
                <div className={`${fileStyles.editAttachmentButton} ${fileStyles.attachmentButton}`}
                    onClick={(e) => {
                        setEditState(!editState)
                    }}
                >edit</div>
                <div className={`${fileStyles.removeAttachmentButton} ${fileStyles.attachmentButton}`}
                    onClick={() => {
                        setAttachedFiles(attachedFiles.filter(file => file.name != name))
                        setNotificationState({ state: 'success', data: { message: `File "${shortenFileName(name, 15)}" removed!` } })
                    }}
                >delete</div>
            </div>
            <div className={fileStyles.attachedFile}>
                {
                    generalType == 'image' ?
                        <img
                            className={fileStyles.attachedImage}
                            alt={name}
                            src={data}
                            title={name}
                        /> :
                        <div className={fileStyles.fileIcon}>
                            {
                                generalType == 'audio' ?
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" height="96" viewBox="0 0 72 96" width="72"><path d="m72 29.3v60.3c0 2.24 0 3.36-.44 4.22-.38.74-1 1.36-1.74 1.74-.86.44-1.98.44-4.22.44h-59.2c-2.24 0-3.36 0-4.22-.44-.74-.38-1.36-1-1.74-1.74-.44-.86-.44-1.98-.44-4.22v-83.2c0-2.24 0-3.36.44-4.22.38-.74 1-1.36 1.74-1.74.86-.44 1.98-.44 4.22-.44h36.3c1.96 0 2.94 0 3.86.22.5.12.98.28 1.44.5v16.88c0 2.24 0 3.36.44 4.22.38.74 1 1.36 1.74 1.74.86.44 1.98.44 4.22.44h16.88c.22.46.38.94.5 1.44.22.92.22 1.9.22 3.86z" fill="#d3d6fd" /><path d="m68.26 20.26c1.38 1.38 2.06 2.06 2.56 2.88.18.28.32.56.46.86h-16.88c-2.24 0-3.36 0-4.22-.44-.74-.38-1.36-1-1.74-1.74-.44-.86-.44-1.98-.44-4.22v-16.880029c.3.14.58.28.86.459999.82.5 1.5 1.18 2.88 2.56z" fill="#939bf9" /><path clipRule="evenodd" d="m34.76 42.16c-.74-.3-1.6-.14-2.18.44l-8.58 9.4h-6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h6l8.58 9.42c.58.58 1.44.74 2.18.44.76-.32 1.24-1.06 1.24-1.86v-32c0-.8-.48-1.54-1.24-1.84zm5.24 3.84v4c5.52 0 10 4.48 10 10s-4.48 10-10 10v4c7.72 0 14-6.28 14-14s-6.28-14-14-14zm0 8c3.3 0 6 2.7 6 6s-2.7 6-6 6v-4c1.1 0 2-.9 2-2s-.9-2-2-2z" fill="#5865f2" fillRule="evenodd" /></svg>
                                    :
                                    generalType == 'video' ?
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" height="96" viewBox="0 0 72 96" width="72"><path d="m72 29.3v60.3c0 2.24 0 3.36-.44 4.22-.38.74-1 1.36-1.74 1.74-.86.44-1.98.44-4.22.44h-59.2c-2.24 0-3.36 0-4.22-.44-.74-.38-1.36-1-1.74-1.74-.44-.86-.44-1.98-.44-4.22v-83.2c0-2.24 0-3.36.44-4.22.38-.74 1-1.36 1.74-1.74.86-.44 1.98-.44 4.22-.44h36.3c1.96 0 2.94 0 3.86.22.5.12.98.28 1.44.5v16.88c0 2.24 0 3.36.44 4.22.38.74 1 1.36 1.74 1.74.86.44 1.98.44 4.22.44h16.88c.22.46.38.94.5 1.44.22.92.22 1.9.22 3.86z" fill="#d3d6fd" /><path d="m68.26 20.26c1.38 1.38 2.06 2.06 2.56 2.88.18.28.32.56.46.86h-16.88c-2.24 0-3.36 0-4.22-.44-.74-.38-1.36-1-1.74-1.74-.44-.86-.44-1.98-.44-4.22v-16.880029c.3.14.58.28.86.459999.82.5 1.5 1.18 2.88 2.56z" fill="#939bf9" /><g fill="#5865f2"><path clipRule="evenodd" d="m16 0h-8v8h8zm0 16h-8v8h8zm-8 16h8v8h-8zm56 0h-8v8h8zm-56 16h8v8h-8zm56 0h-8v8h8zm-56 16h8v8h-8zm56 0h-8v8h8zm-56 16h8v8h-8zm56 0h-8v8h8z" fillRule="evenodd" /><path d="m30 50.98v18l15-9z" /></g></svg>
                                        :
                                        specificType == 'pdf' ?
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" height="96" viewBox="0 0 72 96" width="72"><path d="m72 29.3v60.3c0 2.24 0 3.36-.44 4.22-.38.74-1 1.36-1.74 1.74-.86.44-1.98.44-4.22.44h-59.2c-2.24 0-3.36 0-4.22-.44-.74-.38-1.36-1-1.74-1.74-.44-.86-.44-1.98-.44-4.22v-83.2c0-2.24 0-3.36.44-4.22.38-.74 1-1.36 1.74-1.74.86-.44 1.98-.44 4.22-.44h36.3c1.96 0 2.94 0 3.86.22.5.12.98.28 1.44.5v16.88c0 2.24 0 3.36.44 4.22.38.74 1 1.36 1.74 1.74.86.44 1.98.44 4.22.44h16.88c.22.46.38.94.5 1.44.22.92.22 1.9.22 3.86z" fill="#d3d6fd" /><path d="m68.26 20.26c1.38 1.38 2.06 2.06 2.56 2.88.18.28.32.56.46.86h-16.88c-2.24 0-3.36 0-4.22-.44-.74-.38-1.36-1-1.74-1.74-.44-.86-.44-1.98-.44-4.22v-16.880029c.3.14.58.28.86.459999.82.5 1.5 1.18 2.88 2.56z" fill="#939bf9" /><path d="m56.1014 65.0909c-3.1394-3.2-11.7-1.8909-13.7625-1.6545-2.2633-2.2182-4.1981-4.7273-5.7861-7.4546 1.1317-3.1636 1.7705-6.4727 1.9348-9.8182 0-2.9636-1.2047-6.1636-4.5815-6.1636-1.1864.0364-2.2815.6545-2.9021 1.6545-1.442 2.491-.8397 7.4546 1.4419 12.5455-1.5697 4.6545-3.5592 9.1636-5.9138 13.4909-3.5046 1.4182-10.8604 4.7273-11.4627 8.2909-.2373 1.0909.146 2.2.9674 2.9637.8578.6909 1.9165 1.0545 3.0299 1.0545 4.4719 0 8.8161-6.0364 11.8278-11.1273 3.4315-1.1454 6.936-2.0545 10.4952-2.7272 4.7092 4.0181 8.8161 4.6181 10.9882 4.6181 2.9021 0 3.9791-1.1818 4.3441-2.2545.5293-1.1455.2921-2.5091-.6206-3.4182zm-3.0117 2.0182c-.1277.8364-1.2047 1.6545-3.1394 1.1818-2.2451-.5818-4.3442-1.6364-6.1512-3.0727 1.5697-.2364 5.0743-.6 7.5931-.1273.9674.2364 1.9348.8182 1.6975 2.0182zm-20.1509-24.3818c.2007-.3455.5658-.5637.9673-.6 1.077 0 1.3325 1.3091 1.3325 2.3636-.1278 2.5091-.6023 4.9636-1.442 7.3455-1.8252-4.7273-1.4602-8.0546-.8578-9.1091zm-.2373 22.9454c1.0404-2.1636 1.9713-4.3636 2.7744-6.6182 1.1134 1.7455 2.4093 3.3637 3.8695 4.8546-.0182.1091-3.76.8182-6.6439 1.7636zm-7.1186 4.7455c-2.7744 4.4909-5.6766 7.3454-7.2463 7.3454-.2555-.0181-.5111-.1091-.7301-.2363-.3651-.2364-.5111-.6728-.3651-1.0728.3651-1.6545 3.5046-3.909 8.3415-6.0363z" fill="#5865f2" /></svg>
                                            :
                                            specificType == 'css' || specificType == 'html' || specificType == 'xml' ?
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" height="96" viewBox="0 0 72 96" width="72"><path d="m72 29.3v60.3c0 2.24 0 3.36-.44 4.22-.38.74-1 1.36-1.74 1.74-.86.44-1.98.44-4.22.44h-59.2c-2.24 0-3.36 0-4.22-.44-.74-.38-1.36-1-1.74-1.74-.44-.86-.44-1.98-.44-4.22v-83.2c0-2.24 0-3.36.44-4.22.38-.74 1-1.36 1.74-1.74.86-.44 1.98-.44 4.22-.44h36.3c1.96 0 2.94 0 3.86.22.5.12.98.28 1.44.5v16.88c0 2.24 0 3.36.44 4.22.38.74 1 1.36 1.74 1.74.86.44 1.98.44 4.22.44h16.88c.22.46.38.94.5 1.44.22.92.22 1.9.22 3.86z" fill="#d3d6fd" /><path d="m68.26 20.26c1.38 1.38 2.06 2.06 2.56 2.88.18.28.32.56.46.86h-16.88c-2.24 0-3.36 0-4.22-.44-.74-.38-1.36-1-1.74-1.74-.44-.86-.44-1.98-.44-4.22v-16.880029c.3.14.58.28.86.459999.82.5 1.5 1.18 2.88 2.56z" fill="#939bf9" /><path clipRule="evenodd" d="m25.56 80h4.32l16.56-40h-4.32zm1.1-12-8-8 8-8h-5.66l-8 8 8 8zm26.68-8-8 8h5.66l8-8-8-8h-5.66z" fill="#5865f2" fillRule="evenodd" /></svg>
                                                :
                                                specificType == 'js' || specificType == 'json' || specificType == 'ts' || specificType == 'tsx' || specificType == 'jsx' || specificType == 'x-python' ?
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" height="96" viewBox="0 0 72 96" width="72"><path d="m72 29.3v60.3c0 2.24 0 3.36-.44 4.22-.38.74-1 1.36-1.74 1.74-.86.44-1.98.44-4.22.44h-59.2c-2.24 0-3.36 0-4.22-.44-.74-.38-1.36-1-1.74-1.74-.44-.86-.44-1.98-.44-4.22v-83.2c0-2.24 0-3.36.44-4.22.38-.74 1-1.36 1.74-1.74.86-.44 1.98-.44 4.22-.44h36.3c1.96 0 2.94 0 3.86.22.5.12.98.28 1.44.5v16.88c0 2.24 0 3.36.44 4.22.38.74 1 1.36 1.74 1.74.86.44 1.98.44 4.22.44h16.88c.22.46.38.94.5 1.44.22.92.22 1.9.22 3.86z" fill="#d3d6fd" /><path d="m68.26 20.26c1.38 1.38 2.06 2.06 2.56 2.88.18.28.32.56.46.86h-16.88c-2.24 0-3.36 0-4.22-.44-.74-.38-1.36-1-1.74-1.74-.44-.86-.44-1.98-.44-4.22v-16.880029c.3.14.58.28.86.459999.82.5 1.5 1.18 2.88 2.56z" fill="#939bf9" /><path clipRule="evenodd" d="m23.7 40.46c.66-.28 1.32-.38 1.98-.42.62-.04 1.38-.04 2.26-.04h.06v4c-.96 0-1.58 0-2.04.02-.46.04-.64.08-.72.12-.48.2-.88.6-1.08 1.08-.04.1-.08.26-.12.72-.04.48-.04 1.1-.04 2.06v6.06c0 .88 0 1.64-.04 2.26-.06.66-.14 1.32-.42 1.98-.26.64-.64 1.2-1.1 1.7.46.5.84 1.06 1.1 1.7.28.66.38 1.32.42 1.98.04.62.04 1.38.04 2.26v6.06c0 .96 0 1.58.02 2.04.04.46.08.64.12.72.2.48.6.88 1.08 1.08.1.04.26.08.72.12.48.04 1.1.04 2.06.04v4h-.06c-.88 0-1.64 0-2.26-.04-.66-.06-1.32-.14-1.98-.42-1.46-.6-2.64-1.76-3.24-3.24-.28-.66-.38-1.32-.42-1.98-.04-.62-.04-1.38-.04-2.26v-6.06c0-.96 0-1.58-.02-2.04-.04-.46-.08-.64-.12-.72-.2-.48-.6-.88-1.08-1.08-.1-.04-.26-.08-.72-.12-.48-.04-1.1-.04-2.06-.04v-4c.96 0 1.58 0 2.04-.02.46-.04.64-.08.72-.12.48-.2.88-.58 1.08-1.08.04-.1.08-.26.12-.72.04-.48.04-1.1.04-2.06v-6.06c0-.88 0-1.64.04-2.26.06-.66.14-1.32.42-1.98.6-1.46 1.76-2.64 3.24-3.24zm29.52 17.38c.1.04.26.08.72.12.48.04 1.1.04 2.06.04v4c-.96 0-1.58 0-2.04.02-.46.04-.64.08-.72.12-.48.2-.88.6-1.08 1.08-.04.1-.08.26-.12.72-.04.48-.04 1.1-.04 2.06v6.06c0 .88 0 1.64-.04 2.26-.06.66-.14 1.32-.42 1.98-.6 1.46-1.78 2.64-3.24 3.24-.66.28-1.32.38-1.98.42-.62.04-1.38.04-2.26.04h-.06v-4c.96 0 1.58 0 2.04-.02.46-.04.64-.08.72-.12.48-.2.88-.58 1.08-1.08.04-.1.08-.26.12-.72.04-.48.04-1.1.04-2.06v-6.06c0-.88 0-1.64.04-2.26.06-.66.16-1.32.42-1.98.26-.64.64-1.2 1.1-1.7-.46-.5-.84-1.06-1.1-1.7-.28-.66-.38-1.32-.42-1.98-.04-.62-.04-1.38-.04-2.26v-6.06c0-.96 0-1.58-.02-2.04-.04-.46-.08-.64-.12-.72-.2-.48-.6-.88-1.08-1.08-.1-.04-.26-.08-.72-.12-.48-.04-1.1-.04-2.06-.04v-4h.06c.88 0 1.64 0 2.26.04.66.06 1.32.14 1.98.42 1.46.6 2.64 1.76 3.24 3.24.28.66.38 1.32.42 1.98.04.62.04 1.38.04 2.26v6.06c0 .96 0 1.58.02 2.04.04.46.08.64.12.72.2.48.6.88 1.08 1.08z" fill="#5865f2" fillRule="evenodd" /></svg>
                                                    :
                                                    generalType == 'text' ?
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" height="96" viewBox="0 0 72 96" width="72"><path d="m72 29.3v60.3c0 2.24 0 3.36-.44 4.22-.38.74-1 1.36-1.74 1.74-.86.44-1.98.44-4.22.44h-59.2c-2.24 0-3.36 0-4.22-.44-.74-.38-1.36-1-1.74-1.74-.44-.86-.44-1.98-.44-4.22v-83.2c0-2.24 0-3.36.44-4.22.38-.74 1-1.36 1.74-1.74.86-.44 1.98-.44 4.22-.44h36.3c1.96 0 2.94 0 3.86.22.5.12.98.28 1.44.5v16.88c0 2.24 0 3.36.44 4.22.38.74 1 1.36 1.74 1.74.86.44 1.98.44 4.22.44h16.88c.22.46.38.94.5 1.44.22.92.22 1.9.22 3.86z" fill="#d3d6fd" /><path d="m68.26 20.26c1.38 1.38 2.06 2.06 2.56 2.88.18.28.32.56.46.86h-16.88c-2.24 0-3.36 0-4.22-.44-.74-.38-1.36-1-1.74-1.74-.44-.86-.44-1.98-.44-4.22v-16.880029c.3.14.58.28.86.459999.82.5 1.5 1.18 2.88 2.56z" fill="#939bf9" /><path clipRule="evenodd" d="m56 40h-16v4h16zm0 12h-16v4h16zm-40 12h40v4h-40zm40 12h-40v4h40zm-30-20h-4v-12h-6v-4h16v4h-6z" fill="#5865f2" fillRule="evenodd" /></svg>
                                                        :
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" height="96" viewBox="0 0 72 96" width="72"><path d="m72 29.3v60.3c0 2.24 0 3.36-.44 4.22-.38.74-1 1.36-1.74 1.74-.86.44-1.98.44-4.22.44h-59.2c-2.24 0-3.36 0-4.22-.44-.74-.38-1.36-1-1.74-1.74-.44-.86-.44-1.98-.44-4.22v-83.2c0-2.24 0-3.36.44-4.22.38-.74 1-1.36 1.74-1.74.86-.44 1.98-.44 4.22-.44h36.3c1.96 0 2.94 0 3.86.22.5.12.98.28 1.44.5v16.88c0 2.24 0 3.36.44 4.22.38.74 1 1.36 1.74 1.74.86.44 1.98.44 4.22.44h16.88c.22.46.38.94.5 1.44.22.92.22 1.9.22 3.86z" fill="#d3d6fd" /><path d="m68.26 20.26c1.38 1.38 2.06 2.06 2.56 2.88.18.28.32.56.46.86h-16.88c-2.24 0-3.36 0-4.22-.44-.74-.38-1.36-1-1.74-1.74-.44-.86-.44-1.98-.44-4.22v-16.880029c.3.14.58.28.86.459999.82.5 1.5 1.18 2.88 2.56z" fill="#939bf9" /></svg>
                            }
                        </div>
                }
            </div>
            {
                editState ?
                    <form action="" className={fileStyles.editAttachmentFormContainer}
                        onSubmit={(e) => {
                            e.preventDefault()
                            const formData = new FormData(e.target)
                            let newName = formData.get('new_attachment_name')

                            if (newName.split('.').pop() !== specificType && EXTENSIONS.includes(specificType)) {
                                newName = newName + '.' + specificType
                            } else if (newName === '' || newName === name) {
                                return setEditState(false)
                            }
                            setAttachedFiles(attachedFiles.map(file => {
                                if (file.id === id) {
                                    file.name = newName
                                }
                                return file
                            }))
                            return setEditState(false)
                        }}>
                        <input
                            type="text"
                            name="new_attachment_name"
                            className={fileStyles.editAttachmentInput}
                            defaultValue={name}
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="off"
                            spellCheck="false"
                            onInput={(e) => {
                                e.preventDefault()
                                if (e.target.value.length > MAX_FILE_NAME_LEN) {
                                    e.target.value = e.target.value.slice(0, MAX_FILE_NAME_LEN)
                                    setNotificationState({ state: 'warning', data: { message: 'Your file name is too long!' } })
                                    return false
                                }
                            }}
                        />
                        <button type="submit" className={fileStyles.editAttachmentSubmit}>check_circle</button>
                    </form>
                    :
                    <div className={fileStyles.attachedFileName}>
                        {shortenedName}
                    </div>
            }
        </div>
    )
}

// Custom Context Menu
export function ContextMenu({ x, y, type, data, currentGroup, user, msgsState, socket, setNotificationState }) {
    if (type == null) return <></>
    // messages, groups, users, files
    // Menu Position
    const menuStyles = {
        left: `${x}px`,
        top: `${y}px`,
    }
    if (x > window.innerWidth / 2) {
        menuStyles.left = ''
        menuStyles.right = `${window.innerWidth - x}px`
    }
    if (y > window.innerHeight / 2) {
        menuStyles.top = ''
        menuStyles.bottom = `${window.innerHeight - y}px`
    }

    switch (type.toUpperCase()) {
        case "MESSAGE":
            {

                return (
                    <div data-contexttype="MENU" className={contextMenuStyles.contextMenuWrapper} style={menuStyles}>
                        <MessageContextMenu data={data} group={currentGroup} user={user} msgsState={msgsState} socket={socket} setNotificationState={setNotificationState} />
                    </div>
                )
            }
        case "USER":
            {
                return (
                    <div data-contexttype="MENU" className={contextMenuStyles.contextMenuWrapper} style={menuStyles}>
                        <UserContextMenu data={data} group={currentGroup} user={user} msgsState={msgsState} setNotificationState={setNotificationState} />
                    </div>
                )
            }
        case "FRIEND":
            {
                return (
                    <div data-contexttype="MENU" className={contextMenuStyles.contextMenuWrapper} style={menuStyles}>
                        <FriendContextMenu data={data} group={currentGroup} user={user} msgsState={msgsState} setNotificationState={setNotificationState} />
                    </div>
                )
            }
        case "GROUP":
            {
                return (
                    <div data-contexttype="MENU" className={contextMenuStyles.contextMenuWrapper} style={menuStyles}>
                        <GroupContextMenu data={data} group={currentGroup} user={user} msgsState={msgsState} setNotificationState={setNotificationState} />
                    </div>
                )
            }
        case "FILE":
            {
                return (
                    <div data-contexttype="MENU" className={contextMenuStyles.contextMenuWrapper} style={menuStyles}>
                        <FileContextMenu data={data} group={currentGroup} user={user} setNotificationState={setNotificationState} />
                    </div>
                )
            }
        case "NONE":
        default:
            return <></>
    }
}
export function MessageContextMenu({ group, user, data, socket, msgsState, setNotificationState }) {
    const [messages, setMessages] = msgsState
    const setMessageEdit = data.setMessageEdit
    const groupID = group.id
    const messageID = data.id
    // Current Message
    const groupMessages = messages.find(grp => grp.id == groupID).messages
    const message = groupMessages.find(msg => msg.id == messageID)

    if (message == null) return <></>

    // Message Data
    const messageContent = message.message.content
    const messageLink = `http://localhost:3000/groups/${groupID}/messages/${messageID}`

    const author = user.uid == message.author.uid

    return (
        <ul className={contextMenuStyles.contextMenuContainer}>
            <li className={contextMenuStyles.contextMenuItem}
                onClick={async () => {
                    await navigator.clipboard.writeText(messageContent)
                    setNotificationState({ state: 'success', data: { message: 'Copied to Clipboard' } })
                }}
            >
                <div className={contextMenuStyles.contextMenuItemText}>Copy Content</div>
                <div className={contextMenuStyles.contextMenuItemIcon}>content_copy</div>
            </li>
            <li className={contextMenuStyles.contextMenuItem}
                onClick={async () => {
                    await navigator.clipboard.writeText(messageLink)
                    setNotificationState({ state: 'success', data: { message: 'Copied to Clipboard' } })
                }}
            >
                <div className={contextMenuStyles.contextMenuItemText}>Copy Message Link</div>
                <div className={contextMenuStyles.contextMenuItemIcon}>link</div>
            </li>
            {
                author ?
                    (
                        <>
                            <li className={`${contextMenuStyles.contextMenuItem} ${contextMenuStyles.contextMenuItemWarn}`}
                                onClick={async (e) => {
                                    const target = data.target
                                    setMessageEdit(true)

                                    function handleKeyDown(e) {
                                        if (e.key == 'Escape') {
                                            setMessageEdit(false)
                                        }
                                        else if (e.key == 'Enter' && !e.shiftKey) {
                                            setMessageEdit(false)
                                            const newText = e.target.innerText
                                            if (newText == messageContent) return setNotificationState({ state: 'warning', data: { message: 'Message was not changed' } })
                                            socket.emit('messageEdit-server', { groupId: group.id, messageId: message.id, newMessage: newText, accessToken: jsCookie.get('accessToken') }, (res) => {
                                                if (!res) console.log('error, unable to edit message')
                                                setNotificationState({ state: 'warning', data: { message: 'Message Edited' } })
                                            })
                                        }

                                        target.removeEventListener('keydown', handleKeyDown)
                                    }

                                    target.addEventListener('keydown', (e) => {
                                        handleKeyDown(e)
                                    })
                                }}
                            >
                                <div className={`${contextMenuStyles.contextMenuItemText} ${contextMenuStyles.contextMenuItemTextWarn}`}>Edit Message</div>
                                <div className={`${contextMenuStyles.contextMenuItemIcon} ${contextMenuStyles.contextMenuItemTextWarn}`}>edit</div>
                            </li>
                            <li className={`${contextMenuStyles.contextMenuItem} ${contextMenuStyles.contextMenuItemErr}`}
                                onClick={async () => {
                                    socket.emit('messageDelete-server', { groupId: groupID, messageId: messageID, accessToken: jsCookie.get('accessToken') }, (status) => {
                                        if (!status) console.log('error, unable to delete message')
                                        setNotificationState({ state: 'error', data: { message: 'Message Deleted' } })
                                    })
                                }}
                            >
                                <div className={`${contextMenuStyles.contextMenuItemText} ${contextMenuStyles.contextMenuItemTextErr}`}>Delete Message</div>
                                <div className={`${contextMenuStyles.contextMenuItemIcon} ${contextMenuStyles.contextMenuItemTextErr}`}>delete</div>
                            </li>
                        </>
                    )
                    :
                    null
            }
            <li className={contextMenuStyles.contextMenuItem}
                onClick={async () => {
                    await navigator.clipboard.writeText(messageID)
                    setNotificationState({ state: 'success', data: { message: 'Copied to Clipboard' } })
                }}
            >
                <div className={contextMenuStyles.contextMenuItemText}>Copy ID</div>
                <div className={contextMenuStyles.contextMenuItemIcon}>apps</div>
            </li>
        </ul>
    )
}
export function FileContextMenu({ group, user, data, setNotificationState }) {
    const fileData = data.filedata
    const fileName = data.filename
    const fileSize = data.filesize
    const fileMimeType = data.mimeType
    const fileDimensions = data.dimensions
    let fileAspectRatio = null
    const generalType = fileMimeType.split('/')[0]

    // calculate aspect ratio with gcd
    if (fileDimensions) {
        const r = gcd(fileDimensions.width, fileDimensions.height)
        fileAspectRatio = `${fileDimensions.width / r}:${fileDimensions.height / r}`
    }

    return (
        <ul className={contextMenuStyles.contextMenuContainer}>
            <li className={contextMenuStyles.contextMenuFileInfo}>
                <div title={`File Name: ${fileName}`}>{fileName}</div>
                <div className={contextMenuStyles.contextMenuItemText}>
                    <div title={`File Size: ${fileSize}`}>{fileSize}</div>
                    <div title={`File Type: ${fileMimeType}`}>{fileMimeType}</div>
                </div>
                {
                    fileAspectRatio ?
                        <div className={contextMenuStyles.contextMenuItemText}>
                            <div title={`Intrinsic Aspect Ratio: ${fileAspectRatio}`}>{fileAspectRatio}</div>
                            <div title={`Intrinsic Dimensions: ${fileDimensions.width}x${fileDimensions.height}`}>{`${fileDimensions.width}x${fileDimensions.height}`}</div>
                        </div>
                        : null
                }
            </li>
            <li className={contextMenuStyles.contextMenuItem}
                onClick={() => {
                    downloadBase64File(fileData, fileName)
                    setNotificationState({ state: 'success', data: { message: 'Downloaded File' } })
                }}
            >
                <div className={contextMenuStyles.contextMenuItemText}>Download {
                    generalType == 'image' ? 'Image' : generalType == 'video' ? 'Video' : generalType == 'audio' ? 'Audio' : 'File'
                }</div>
                <div className={contextMenuStyles.contextMenuItemIcon} >file_download</div>
            </li>
            <li className={contextMenuStyles.contextMenuItem}
                onClick={() => {
                    const w = window.open('about:blank');

                    setTimeout(function () { //FireFox seems to require a setTimeout for this to work.
                        const body = w.document.body;
                        if (generalType == 'audio') {
                            const audio = document.createElement('audio');
                            audio.src = fileData;
                            audio.controls = true;
                            body.appendChild(audio);
                        } else if (generalType == 'video') {
                            const video = document.createElement('video');
                            video.src = fileData;
                            video.controls = true;
                            body.appendChild(video);
                        } else if (generalType == 'image') {
                            const img = document.createElement('img');
                            img.src = fileData;
                            img.style.maxWidth = '100%';
                            img.style.maxHeight = '100%';
                            body.appendChild(img);
                        } else {
                            const iframe = document.createElement('iframe');
                            iframe.src = fileData
                            body.appendChild(iframe);
                            iframe.style.width = '100%'
                            iframe.style.height = '100%'
                            iframe.style.padding = '0'
                            iframe.style.margin = '0'
                            iframe.style.border = 'none'
                        }
                        body.style.display = 'flex';
                        body.style.alignItems = 'center';
                        body.style.justifyContent = 'center';
                        body.style.backgroundColor = 'black'
                        body.style.width = '100%'
                        body.style.height = '100%'
                        body.style.border = 'none'
                        body.style.padding = '0'
                        body.style.margin = '0'
                    }, 0);
                }}
            >
                <div className={contextMenuStyles.contextMenuItemText}>Open In New Tab</div>
                <div className={contextMenuStyles.contextMenuItemIcon} >open_in_new</div>
            </li>
        </ul>
    )
}
// TODO: Finish the rest of the context menus
export function UserContextMenu({ group, user, msgsState, data }) {
    const [messages, setMessages] = msgsState
    return (
        <ul className={contextMenuStyles.contextMenuContainer}>
            <li className={contextMenuStyles.contextMenuItem}>
                <div className={contextMenuStyles.contextMenuItemText}>asd</div>
                <div className={contextMenuStyles.contextMenuItemIcon}></div>
            </li>
        </ul>
    )
}
export function GroupContextMenu({ group, user, msgsState, data }) {
    return <></>
}
export function FriendContextMenu({ group, user, msgsState, data }) { // remove friend,...
    return <></>
}

// Modals
export function MiniNotificationModal({ state, setState }) { // click to close, status will determine icon and color, message will be displayed
    const [hover, setHover] = useState(false)
    const text = state.data ? state.data.message : ''

    function closeModal() {
        setState({ state: `close ${state.state}`, data: state.data })
        const timeout = setTimeout(() => {
            setState({ state: 'null', data: null })
            clearTimeout(timeout)
        }, 300);
    }

    useEffect(() => { // Close modal after 3 seconds
        if (state.state.match(/null/g) || hover) return

        const timeout = setTimeout(closeModal, 3000);

        return () => {
            clearTimeout(timeout)
        }
    }, [state.state, hover])

    return (
        <div className={modalStyles.miniModalContainer} data-state={state.state}
            onClick={closeModal}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
        >
            {text}
        </div>
    )
}
export function FullModalWrapper({ state, setState, children }) { // title, content, status
    return (
        <div className={modalStyles.fullModalContainer} data-state={state.state}>
            <div className={modalStyles.fullModalBackground} onClick={() => setState({ state: false, data: state.data })}></div>
            <div className={modalStyles.fullModalContent}>
                <div className={modalStyles.fullModalClose}>
                    <div className={modalStyles.fullModalCloseIcon} onClick={() => setState({ state: false, data: state.data })}>close</div>
                </div>
                <div className={modalStyles.fullModalTitle}>{state.data ? state.data.title : ''}</div>

                <div className={modalStyles.fullModalChildren}>{children}</div>
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
export function AccountDropdown({ signOut, username }) {
    const [open, setOpen] = useState(false)
    const [clickOpen, setClickOpen] = useState(false)
    const [signOutLoading, setSignOutLoading] = useState(false)

    return (
        <div className={homeStyles.dropdownContainer} style={{ borderRadius: open ? '6px 6px 0 0' : '6px' }}
            onMouseOver={() => {
                if (!clickOpen) setOpen(true)
            }}
            onMouseLeave={() => {
                if (!clickOpen) setOpen(false)
            }}
        >
            <div className={homeStyles.dropdownButton}
                style={{ borderRadius: open ? '6px 6px 0 0' : '6px' }}
                onClick={() => setClickOpen(!clickOpen)}
            >
                <div className={homeStyles.dropdownButtonText}>{shortenName(username, 25)}</div>
                <div className={homeStyles.dropdownButtonIcon}>account_circle</div>
            </div>
            <ul className={homeStyles.dropdown} style={{ top: open ? '44px' : '40px', opacity: open ? '1' : '0', pointerEvents: open ? 'all' : 'none' }}>
                <li className={homeStyles.dropdownItem} onClick={() => window.location = '/account/myaccount'}>
                    <div className={homeStyles.dropdownItemText}>Settings</div>
                    <div className={homeStyles.dropdownItemIcon}>settings</div>
                </li>
                <li className={`${homeStyles.dropdownItem} ${homeStyles.dropdownItemImportant}`} onClick={async () => {
                    setSignOutLoading(true)
                    setTimeout(async () => {
                        await signOut()
                    }, 1500);
                }}>
                    {
                        signOutLoading ?
                            <Spinner color={'#d25041'} height={23} width={23} thickness={4} animationDuration={'.95s'} />
                            :
                            <>
                                <div className={homeStyles.dropdownItemText}>Sign Out</div>
                                <div className={homeStyles.dropdownItemIcon}>logout</div>
                            </>
                    }
                </li>
            </ul>
        </div>
    )
}