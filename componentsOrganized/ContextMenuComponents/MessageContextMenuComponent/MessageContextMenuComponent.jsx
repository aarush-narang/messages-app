export function MessageContextMenuComponent({ group, user, data, socket, msgsState, setNotificationState }) {
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
    const messageLink = `http://localhost:3000/groups/${groupID}/${messageID}`

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
                                    setMessageEdit(true)
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