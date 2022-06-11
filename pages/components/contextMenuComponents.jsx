import contextMenuStyles from "../../styles/ChatStyles/ContextMenuStyles.module.css";
import { useDebounce, shortenName, formatBytes, shortenFileName, calculateFileSize, downloadBase64File, formatDuration, gcd, formatMessageInput } from "./util";
import jsCookie from "js-cookie";
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