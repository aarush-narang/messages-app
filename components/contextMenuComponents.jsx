import contextMenuStyles from "../styles/ChatStyles/ContextMenuStyles.module.css";
import modalStyles from "../styles/ChatStyles/ModalComponentStyles.module.css";
import { downloadBase64File, gcd, shortenName } from "./util";
import jsCookie from "js-cookie";
import { useRef, useMemo } from "react";
import { MultiSelect } from "./formComponents";
import { MAXIMUM_GROUP_NAME_LENGTH, MINIMUM_GROUP_NAME_LENGTH } from './chatComponents'
// Custom Context Menu
export function ContextMenu({ ctxMenu, ctxMenuPos, ctxMenuData, currentGroup, user, groups, msgsState, socket, setNotificationState, setFullModalState, friendsOptions }) {
    const [type, setType] = ctxMenu
    if (type == null) return <></>
    const [pos, setPos] = ctxMenuPos
    const { x, y } = pos
    const [data, setData] = ctxMenuData

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
                        <MessageContextMenu data={data} group={currentGroup} user={user} msgsState={msgsState} socket={socket} setNotificationState={setNotificationState} setFullModalState={setFullModalState} />
                    </div>
                )
            }
        case "USER":
            {
                return (
                    <div data-contexttype="MENU" className={contextMenuStyles.contextMenuWrapper} style={menuStyles}>
                        <UserContextMenu data={data} group={currentGroup} user={user} socket={socket} setNotificationState={setNotificationState} setFullModalState={setFullModalState} />
                    </div>
                )
            }
        case "GROUP":
            {
                return (
                    <div data-contexttype="MENU" className={contextMenuStyles.contextMenuWrapper} style={menuStyles}>
                        <GroupContextMenu
                            data={data}
                            groups={groups}
                            group={currentGroup}
                            user={user}
                            socket={socket}
                            setNotificationState={setNotificationState}
                            setFullModalState={setFullModalState}
                            friendsOptions={friendsOptions}
                            ctxMenu={ctxMenu}
                            ctxMenuPos={ctxMenuPos}
                            ctxMenuData={ctxMenuData}
                        />
                    </div>
                )
            }
        case "FILE":
            {
                return (
                    <div data-contexttype="MENU" className={contextMenuStyles.contextMenuWrapper} style={menuStyles}>
                        <FileContextMenu data={data} group={currentGroup} user={user} socket={socket} setNotificationState={setNotificationState} setFullModalState={setFullModalState} />
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
                onClick={() => {
                    if (navigator.clipboard) {
                        navigator.clipboard.writeText(messageContent)
                        setNotificationState({ state: 'success', data: { message: 'Copied to Clipboard' } })
                    } else {
                        setNotificationState({ state: 'error', data: { message: 'Your browser does not support the Clipboard API' } })
                    }
                }}
            >
                <div className={contextMenuStyles.contextMenuItemText}>Copy Content</div>
                <div className={contextMenuStyles.contextMenuItemIcon}>content_copy</div>
            </li>
            <li className={contextMenuStyles.contextMenuItem}
                onClick={() => {
                    if (navigator.clipboard) {
                        navigator.clipboard.writeText(messageLink)
                        setNotificationState({ state: 'success', data: { message: 'Copied to Clipboard' } })
                    } else {
                        setNotificationState({ state: 'error', data: { message: 'Your browser does not support the Clipboard API' } })
                    }
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
                                <div className={contextMenuStyles.contextMenuItemText}>Edit Message</div>
                                <div className={contextMenuStyles.contextMenuItemIcon}>edit</div>
                            </li>
                            <li className={`${contextMenuStyles.contextMenuItem} ${contextMenuStyles.contextMenuItemErr}`}
                                onClick={async () => {
                                    socket.emit('messageDelete-server', { groupId: groupID, messageId: messageID, accessToken: jsCookie.get('accessToken') }, (status) => {
                                        if (!status) console.log('error, unable to delete message')
                                        setNotificationState({ state: 'error', data: { message: 'Message Deleted' } })
                                    })
                                }}
                            >
                                <div className={contextMenuStyles.contextMenuItemText}>Delete Message</div>
                                <div className={contextMenuStyles.contextMenuItemIcon}>delete</div>
                            </li>
                        </>
                    )
                    :
                    null
            }
            <li className={contextMenuStyles.contextMenuItem}
                onClick={() => {
                    if (navigator.clipboard) {
                        navigator.clipboard.writeText(messageID)
                        setNotificationState({ state: 'success', data: { message: 'Copied to Clipboard' } })
                    } else {
                        setNotificationState({ state: 'error', data: { message: 'Your browser does not support the Clipboard API' } })
                    }
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
            <li className={contextMenuStyles.contextMenuFileInfo} data-contexttype={'OPTIONS'}>
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
export function UserContextMenu({ group, user, socket, data, setNotificationState, setFullModalState }) {
    const userID = data.user ? data.user.uid : null
    const [setModalState, setModalContent] = setFullModalState

    return (
        <ul className={contextMenuStyles.contextMenuContainer}>
            {
                group.owner == user.uid && userID != user.uid && group.members.find(member => member.uid == userID) ?
                    <li className={`${contextMenuStyles.contextMenuItem} ${contextMenuStyles.contextMenuItemErr}`}
                        onClick={() => {
                            setModalState(true)
                            setModalContent(
                                <form
                                    className={modalStyles.modalContainer}
                                    onSubmit={(e) => {
                                        e.preventDefault()
                                        socket.emit('groupMemberRemove-server', { groupId: group.id, userId: userID, accessToken: jsCookie.get('accessToken') }, (status) => {
                                            if (status.success) {
                                                setNotificationState({ state: 'success', data: { message: 'Removed User' } })
                                            } else {
                                                setNotificationState({ state: 'error', data: { message: status.message || 'Unable to remove user.' } })
                                            }
                                        })

                                        setModalState(false)
                                    }}
                                >
                                    <div className={modalStyles.modalHeader}>
                                        <div className={modalStyles.modalTitle}>Remove "@{shortenName(data.user.username, 20)}"?</div>
                                        <div className={modalStyles.leaveModalDescription}>
                                            Are you sure you want to remove <b>@{data.user.username}</b>? <b className={modalStyles.modalErrText}>They will not be able to rejoin until they are re-invited.</b>
                                        </div>
                                    </div>
                                    <div className={modalStyles.modalButtons}>
                                        <button className={modalStyles.modalButton} type={'button'}
                                            onClick={() => {
                                                setModalState(false)
                                            }}
                                        >Cancel</button>
                                        <button className={`${modalStyles.modalButton} ${modalStyles.modalBtnErr}`} type={'submit'}>Confirm Remove</button>
                                    </div>
                                </form>
                            )

                        }}
                    >
                        <div className={contextMenuStyles.contextMenuItemText}>Remove User</div>
                        <div className={contextMenuStyles.contextMenuItemIcon}>person_remove</div>
                    </li>
                    :
                    group.owner == user.uid && userID != user.uid && !group.members.find(member => member.uid == userID) && user.friends.current.find(user => user.uid == userID) ?
                        <li className={`${contextMenuStyles.contextMenuItem} ${contextMenuStyles.contextMenuItemSuccess}`}
                            onClick={() => {
                                socket.emit('groupJoin-server', {
                                    groupId: group.id,
                                    addedMembers: [userID],
                                    accessToken: jsCookie.get('accessToken'),
                                }, (status) => {
                                    if (status.success) {
                                        setNotificationState({ state: 'success', data: { message: `Added @${user.username}` } })
                                    } else {
                                        setNotificationState({ state: 'error', data: { message: status.message } })
                                    }
                                })
                            }}
                        >
                            <div className={contextMenuStyles.contextMenuItemText}>Add to Group</div>
                            <div className={contextMenuStyles.contextMenuItemIcon}>person_add</div>
                        </li>
                        :
                        null
            }
            {
                group.owner == user.uid && userID != user.uid && group.members.find(member => member.uid == userID) ?
                    <li className={`${contextMenuStyles.contextMenuItem} ${contextMenuStyles.contextMenuItemErr}`}
                        onClick={() => {
                            setModalState(true)
                            setModalContent(
                                <form
                                    className={modalStyles.modalContainer}
                                    onSubmit={(e) => {
                                        e.preventDefault()

                                        socket.emit('groupOwnerChange-server', { groupId: group.id, userId: userID, accessToken: jsCookie.get('accessToken') }, (status) => {
                                            if (status.success) {
                                                setNotificationState({ state: 'success', data: { message: `@${data.user.username} is now the owner of ${group.name}` } })
                                            } else {
                                                setNotificationState({ state: 'error', data: { message: status.message || 'Unable to promote user.' } })
                                            }
                                        })

                                        setModalState(false)
                                    }}
                                >
                                    <div className={modalStyles.modalHeader}>
                                        <div className={modalStyles.modalTitle}>Make "@{shortenName(data.user.username, 20)}" owner?</div>
                                        <div className={modalStyles.leaveModalDescription}>
                                            Are you sure you want to make <b>@{data.user.username}</b> the owner of <b>{group.name}</b>?
                                            <br />
                                            <br />
                                            <b className={modalStyles.modalErrText}>You will not be able to get back to being owner of this group unless @{data.user.username} makes you the owner again. You will also lose privilages to remove users.</b>
                                        </div>
                                    </div>
                                    <div className={modalStyles.modalButtons}>
                                        <button className={modalStyles.modalButton} type={'button'}
                                            onClick={() => {
                                                setModalState(false)
                                            }}
                                        >Cancel</button>
                                        <button className={`${modalStyles.modalButton} ${modalStyles.modalBtnErr}`} type={'submit'}>Confirm Promote</button>
                                    </div>
                                </form>
                            )
                        }}
                    >
                        <div className={contextMenuStyles.contextMenuItemText}>Make Group Owner</div>
                        <div className={contextMenuStyles.contextMenuItemIcon}>add_moderator</div>
                    </li>
                    :
                    null
            }
            {
                user.friends.current.find(user => user.uid == userID) && userID !== user.uid ?
                    <li className={`${contextMenuStyles.contextMenuItem} ${contextMenuStyles.contextMenuItemErr}`}
                        onClick={() => {
                            setModalState(true)
                            setModalContent(
                                <form
                                    className={modalStyles.modalContainer}
                                    onSubmit={(e) => {
                                        e.preventDefault()

                                        socket.emit('friendRemove-server', { accessToken: jsCookie.get('accessToken'), friend: { uid: userID }, status: { action: 'remove', state: 'current' } }, (data) => {
                                            if (data.error) setNotificationState({ state: 'error', data: { message: data.error } })
                                            else if (data.success) setNotificationState({ state: 'success', data: { message: data.success } })
                                            else setNotificationState({ state: 'success', data: { message: data.success } })
                                        })

                                        setModalState(false)
                                    }}
                                >
                                    <div className={modalStyles.modalHeader}>
                                        <div className={modalStyles.modalTitle}>Remove "@{shortenName(data.user.username, 20)}"?</div>
                                        <div className={modalStyles.leaveModalDescription}>
                                            Are you sure you want to remove <b>@{data.user.username}</b> from your friends list? <b className={modalStyles.modalErrText}>You will need to re-friend them to add them to groups.</b>
                                        </div>
                                    </div>
                                    <div className={modalStyles.modalButtons}>
                                        <button className={modalStyles.modalButton} type={'button'}
                                            onClick={() => {
                                                setModalState(false)
                                            }}
                                        >Cancel</button>
                                        <button className={`${modalStyles.modalButton} ${modalStyles.modalBtnErr}`} type={'submit'}>Confirm Remove</button>
                                    </div>
                                </form>
                            )
                        }}
                    >
                        <div className={contextMenuStyles.contextMenuItemText}>Remove Friend</div>
                        <div className={contextMenuStyles.contextMenuItemIcon}>remove</div>
                    </li>
                    :
                    userID !== user.uid ?
                        <li className={`${contextMenuStyles.contextMenuItem} ${contextMenuStyles.contextMenuItemSuccess}`}
                            onClick={() => {
                                socket.emit('friendRequest-server', { friend: { uid: userID }, accessToken: jsCookie.get('accessToken') }, (status) => {
                                    if (status.success) {
                                        setNotificationState({ state: 'success', data: { message: 'Friend Request Sent' } })
                                    } else {
                                        setNotificationState({ state: 'error', data: { message: status.error || 'Unable to send friend request.' } })
                                    }
                                })
                            }}
                        >
                            <div className={contextMenuStyles.contextMenuItemText}>Add Friend</div>
                            <div className={contextMenuStyles.contextMenuItemIcon}>add</div>
                        </li>
                        :
                        null
            }
            <li className={contextMenuStyles.contextMenuItem}
                onClick={() => {
                    if (navigator.clipboard) {
                        navigator.clipboard.writeText(userID)
                        setNotificationState({ state: 'success', data: { message: 'Copied to Clipboard' } })
                    }
                    else {
                        setNotificationState({ state: 'error', data: { message: 'Your browser does not support the Clipboard API' } })
                    }
                }}
            >
                <div className={contextMenuStyles.contextMenuItemText}>Copy ID</div>
                <div className={contextMenuStyles.contextMenuItemIcon}>apps</div>
            </li>
        </ul>
    )
}
export function GroupContextMenu({ groups, user, data, socket, setNotificationState, setFullModalState, friendsOptions, ctxMenu, ctxMenuPos, ctxMenuData }) {
    const [contextMenu, setContextMenu] = ctxMenu
    const [contextMenuPos, setContextMenuPos] = ctxMenuPos
    const [contextMenuData, setContextMenuData] = ctxMenuData

    const groupID = data.groupId ? data.groupId : null
    const group = useMemo(() => {
        return groups.find(group => group.id == groupID)
    }, [groups, groupID])
    if (!group) return <></>
    const groupName = group ? group.name : ''
    const [setModalState, setModalContent] = setFullModalState
    const newGroupNameRef = useRef(null)

    const newGroupIconRef = useRef(null)
    const currentIconDisplayRef = useRef(null)

    const selectedFriendsRef = useRef([])
    const setSelectedFriends = (friends) => {
        selectedFriendsRef.current = friends
    }

    const options = friendsOptions.filter(friend => !group.members.find(member => member.uid == friend.data.uid))

    function handleContextMenuUser(e, user) {
        e.preventDefault()
        const path = e.nativeEvent.composedPath()
        const mainTarget = path.find(p => p.dataset && p.dataset.contexttype)
        const contextType = mainTarget ? mainTarget.dataset.contexttype : 'NONE'

        if (contextType == 'MENU') return

        const x = e.clientX
        const y = e.clientY


        if (contextType == 'USER') {
            setContextMenu('USER')
            setContextMenuData({ user, target: mainTarget })
        }

        setContextMenuPos({ x, y })
    }

    return (
        <ul className={contextMenuStyles.contextMenuContainer}>
            <li className={contextMenuStyles.contextMenuItem}
                onClick={() => {
                    setModalState(true)
                    setModalContent(
                        <form
                            className={modalStyles.modalContainer}
                            onSubmit={(e) => {
                                e.preventDefault()

                                if (!group) return setNotificationState({ state: 'error', data: { message: 'Group not found.' } })
                                else if (selectedFriendsRef.current.length > 0) {
                                    socket.emit('groupJoin-server', {
                                        groupId: groupID,
                                        addedMembers: selectedFriendsRef.current.map(friend => friend.data.uid),
                                        accessToken: jsCookie.get('accessToken'),
                                    }, (status) => {
                                        if (status.success) {
                                            setNotificationState({ state: 'success', data: { message: `Added ${selectedFriendsRef.current.length} friend(s) to group.` } })
                                        } else {
                                            setNotificationState({ state: 'error', data: { message: status.message } })
                                        }
                                    })
                                } else {
                                    setNotificationState({ state: 'error', data: { message: 'Cancelled. No friends selected.' } })
                                }
                                setModalState(false)
                            }}
                        >
                            <div className={modalStyles.modalHeader}>
                                <div className={modalStyles.modalTitle}>Add friends to "{groupName}"</div>
                                <div className={modalStyles.leaveModalDescription}>
                                    Who would you like to add to "{groupName}"?
                                </div>
                            </div>
                            <div className={modalStyles.modalMultiSelect}>
                                <MultiSelect
                                    options={
                                        options
                                    }
                                    onChange={(data) => {
                                        setSelectedFriends(data)
                                    }}
                                />
                            </div>
                            <div className={modalStyles.modalButtons}>
                                <button className={modalStyles.modalButton} type={'button'}
                                    onClick={() => {
                                        setModalState(false)
                                    }}
                                >Cancel</button>
                                <button className={`${modalStyles.modalButton} ${modalStyles.modalBtnSuccess}`} type={'submit'}>Add Selected</button>
                            </div>
                        </form>
                    )
                }}
            >
                <div className={contextMenuStyles.contextMenuItemText}>Add Friends</div>
                <div className={contextMenuStyles.contextMenuItemIcon}>person_add</div>
            </li>
            <li className={contextMenuStyles.contextMenuItem}
                onClick={() => {
                    setModalState(true)
                    setModalContent(
                        <form
                            className={modalStyles.modalContainer}
                            onSubmit={(e) => { e.preventDefault() }}
                        >
                            <div className={modalStyles.modalHeader}>
                                <div className={modalStyles.modalTitle}>Members: "{groupName}"</div>
                                <div className={modalStyles.leaveModalDescription}>
                                    List of members in "{groupName}".
                                </div>
                            </div>
                            <div className={modalStyles.modalViewMembersContainer}>
                                {
                                    group.members.map(member => {
                                        return (
                                            <div className={modalStyles.modalViewMembersItem} key={member.uid}
                                                onContextMenu={(e) => {
                                                    handleContextMenuUser(e, member)
                                                }}
                                            >
                                                <div className={modalStyles.modalViewMembersItemHead}>
                                                    <img className={modalStyles.modalViewMembersItemIcon} src={member.icon} alt={`${member.username}'s icon`} />
                                                    <div className={modalStyles.modalViewMembersItemName}><b data-contexttype="USER">@{member.username}</b> {member.uid == user.uid ? '(you)' : ''}</div>
                                                </div>
                                                <div className={modalStyles.modalViewMembersItemMemberStatus}>{group.owner == member.uid ? '(owner)' : '(member)'}</div>
                                            </div>
                                        )
                                    })
                                }
                            </div>
                            <div className={modalStyles.modalButtons}>
                                <button className={modalStyles.modalButton} type={'button'} style={{ gridColumn: 'span 2' }}
                                    onClick={() => {
                                        setModalState(false)
                                    }}
                                >Close</button>
                            </div>
                        </form>
                    )
                }}
            >
                <div className={contextMenuStyles.contextMenuItemText}>View Members</div>
                <div className={contextMenuStyles.contextMenuItemIcon}>groups</div>
            </li>
            <li className={`${contextMenuStyles.contextMenuItem} ${contextMenuStyles.contextMenuItemWarn}`}
                onClick={() => {
                    setModalState(true)
                    setModalContent(
                        <form
                            className={modalStyles.modalContainer}
                            onSubmit={(e) => {
                                e.preventDefault()

                                const inputValue = newGroupNameRef.current.value
                                if (inputValue.length < MINIMUM_GROUP_NAME_LENGTH || inputValue.length > MAXIMUM_GROUP_NAME_LENGTH) {
                                    setNotificationState({ state: 'error', data: { message: `Please enter a name with at least ${MINIMUM_GROUP_NAME_LENGTH} characters and at most ${MAXIMUM_GROUP_NAME_LENGTH}.` } })
                                } else if (inputValue === groupName) {
                                    setNotificationState({ state: 'error', data: { message: 'New name cannot be the same as the previous one.' } })
                                } else {
                                    socket.emit('groupEdit-server', { newGroupName: inputValue, newGroupIcon: null, groupId: groupID, accessToken: jsCookie.get('accessToken') }, (status) => {
                                        if (status.success) {
                                            setNotificationState({ state: 'success', data: { message: `Renamed "${groupName}" to "${inputValue}".` } })
                                        } else {
                                            setNotificationState({ state: 'error', data: { message: status.message } })
                                        }
                                    })

                                    setModalState(false)
                                }
                            }}
                        >
                            <div className={modalStyles.modalHeader}>
                                <div className={modalStyles.modalTitle}>Edit "{groupName}"?</div>
                                <div className={modalStyles.leaveModalDescription}>
                                    What would you like to change the name to for "{groupName}"?
                                </div>
                            </div>
                            <div className={modalStyles.modalInput}>
                                <input type={'text'} placeholder={'Enter new group name...'} ref={newGroupNameRef} />
                            </div>
                            <div className={modalStyles.modalButtons}>
                                <button className={modalStyles.modalButton} type={'button'}
                                    onClick={() => {
                                        setModalState(false)
                                    }}
                                >Cancel</button>
                                <button className={`${modalStyles.modalButton} ${modalStyles.modalBtnSuccess}`} type={'submit'}>Save Changes</button>
                            </div>
                        </form>
                    )
                }}
            >
                <div className={contextMenuStyles.contextMenuItemText}>Edit Name</div>
                <div className={contextMenuStyles.contextMenuItemIcon}>edit</div>
            </li>
            <li className={`${contextMenuStyles.contextMenuItem} ${contextMenuStyles.contextMenuItemWarn}`}
                onClick={() => {
                    setModalState(true)
                    setModalContent(
                        <form
                            className={modalStyles.modalContainer}
                            onSubmit={(e) => {
                                e.preventDefault()

                                const currentIcon = currentIconDisplayRef.current.src
                                if (currentIcon == group.icon) {
                                    setNotificationState({ state: 'error', data: { message: 'New icon cannot be the same as the previous one.' } })
                                } else {
                                    socket.emit('groupEdit-server', { newGroupName: null, newGroupIcon: currentIconDisplayRef.current.src, groupId: groupID, accessToken: jsCookie.get('accessToken') }, (status) => {
                                        if (status.success) {
                                            setNotificationState({ state: 'success', data: { message: `Changed icon.` } })
                                        } else {
                                            setNotificationState({ state: 'error', data: { message: status.message } })
                                        }
                                    })

                                    setModalState(false)
                                }
                            }}
                        >
                            <div className={modalStyles.modalHeader}>
                                <div className={modalStyles.modalTitle}>Edit "{groupName}"?</div>
                                <div className={modalStyles.leaveModalDescription}>
                                    What would you like to change the icon to for "{groupName}"?
                                </div>
                            </div>
                            <div className={modalStyles.modalInput}>
                                <label className={modalStyles.modalInputCurrentImageDisplayContainer} htmlFor="icon_input" style={{ alignSelf: 'center' }}>
                                    <img className={modalStyles.modalInputCurrentImageDisplay} ref={currentIconDisplayRef} loading="lazy" src={group.icon} />
                                    <div className={modalStyles.modalInputCurrentImageDisplayHover}>CHANGE ICON</div>
                                </label>
                                <input className={modalStyles.modalNewIconInput} type="file" id="icon_input" ref={newGroupIconRef} accept={'image/*'}
                                    onInput={(e) => {
                                        if (e.target.files[0]) {
                                            if (!e.target.files[0].type.includes('image')) return setNotificationState({ state: 'error', data: { message: 'Please select an image file.' } })
                                            const reader = new FileReader()
                                            reader.onload = (e) => {
                                                currentIconDisplayRef.current.src = e.target.result
                                            }
                                            reader.readAsDataURL(e.target.files[0])
                                        }
                                    }}
                                />
                            </div>
                            <div className={modalStyles.modalButtons}>
                                <button className={modalStyles.modalButton} type={'button'}
                                    onClick={() => {
                                        setModalState(false)
                                    }}
                                >Cancel</button>
                                <button className={`${modalStyles.modalButton} ${modalStyles.modalBtnSuccess}`} type={'submit'}>Save Changes</button>
                            </div>
                        </form>
                    )
                }}
            >
                <div className={contextMenuStyles.contextMenuItemText}>Change Icon</div>
                <div className={contextMenuStyles.contextMenuItemIcon}>image</div>
            </li>
            <li className={`${contextMenuStyles.contextMenuItem} ${contextMenuStyles.contextMenuItemErr}`}
                onClick={() => {
                    setModalState(true)
                    setModalContent(
                        <form
                            className={modalStyles.modalContainer}
                            onSubmit={(e) => {
                                e.preventDefault()

                                socket.emit('groupLeave-server', { groupId: groupID, accessToken: jsCookie.get('accessToken') }, (status) => {
                                    if (status.success) {
                                        setNotificationState({ state: 'success', data: { message: `Left Group "${group.name}"` } })
                                    } else {
                                        setNotificationState({ state: 'error', data: { message: status.message } })
                                    }
                                })

                                setModalState(false)
                                setNotificationState({ state: 'success', data: { message: `Left group "${groupName}"` } })
                            }}
                        >
                            <div className={modalStyles.modalHeader}>
                                <div className={modalStyles.modalTitle}>Leave "{groupName}"?</div>
                                <div className={modalStyles.leaveModalDescription}>
                                    Are you sure you want to leave <b>{groupName}</b>? <b className={modalStyles.modalErrText}>You will not be able to rejoin until you are re-invited.</b>
                                </div>
                            </div>
                            <div className={modalStyles.modalButtons}>
                                <button className={modalStyles.modalButton} type={'button'}
                                    onClick={() => {
                                        setModalState(false)
                                    }}
                                >Cancel</button>
                                <button className={`${modalStyles.modalButton} ${modalStyles.modalBtnErr}`} type={'submit'}>Leave Group</button>
                            </div>
                        </form>
                    )
                }}
            >
                <div className={contextMenuStyles.contextMenuItemText}>Leave Group</div>
                <div className={contextMenuStyles.contextMenuItemIcon}>exit_to_app</div>
            </li>
            {
                group.owner == user.uid ?
                    <li className={`${contextMenuStyles.contextMenuItem} ${contextMenuStyles.contextMenuItemErr}`}
                        onClick={() => {
                            setModalState(true)
                            setModalContent(
                                <form
                                    className={modalStyles.modalContainer}
                                    onSubmit={(e) => {
                                        e.preventDefault()

                                        const inputValue = newGroupNameRef.current.value
                                        if (inputValue !== groupName) {
                                            setNotificationState({ state: 'error', data: { message: 'Group name does not match' } })
                                        } else {
                                            setModalState(false)
                                            socket.emit('groupDelete-server', { accessToken: jsCookie.get('accessToken'), groupId: groupID }, (status) => {
                                                if (status.success) {
                                                    setNotificationState({ state: 'success', data: { message: `Deleted group "${groupName}". Everyone in the group has been kicked.` } })
                                                } else {
                                                    setNotificationState({ state: 'error', data: { message: status.message } })
                                                }
                                            })
                                        }
                                    }}
                                >
                                    <div className={modalStyles.modalHeader}>
                                        <div className={modalStyles.modalTitle}>Delete "{groupName}"?</div>
                                        <div className={modalStyles.leaveModalDescription}>
                                            Are you sure you want to delete <b>{groupName}</b>? <b className={modalStyles.modalErrText}>Everyone in the group will be kicked and you will not be able to restore the group after deletion.</b>
                                            <br />
                                            <br />
                                            <b className={modalStyles.modalWarnText}>Please type the Group Name to confirm.</b>
                                        </div>
                                    </div>
                                    <div className={modalStyles.modalInput}>
                                        <input type="text" placeholder={groupName} ref={newGroupNameRef} />
                                    </div>
                                    <div className={modalStyles.modalButtons}>
                                        <button className={modalStyles.modalButton} type={'button'}
                                            onClick={() => {
                                                setModalState(false)
                                            }}
                                        >Cancel</button>
                                        <button className={`${modalStyles.modalButton} ${modalStyles.modalBtnErr}`} type={'submit'}>Delete Group Forever</button>
                                    </div>
                                </form>
                            )
                        }}
                    >
                        <div className={contextMenuStyles.contextMenuItemText}>Delete Group Forever</div>
                        <div className={contextMenuStyles.contextMenuItemIcon}>delete_forever</div>
                    </li>
                    :
                    null
            }
            <li className={contextMenuStyles.contextMenuItem}
                onClick={() => {
                    if (navigator.clipboard) {
                        navigator.clipboard.writeText(groupID)
                        setNotificationState({ state: 'success', data: { message: 'Copied to Clipboard' } })
                    }
                    else {
                        setNotificationState({ state: 'error', data: { message: 'Your browser does not support the Clipboard API' } })
                    }
                }}
            >
                <div className={contextMenuStyles.contextMenuItemText}>Copy ID</div>
                <div className={contextMenuStyles.contextMenuItemIcon}>apps</div>
            </li>
        </ul>
    )
}