export function SystemMessageComponent({ message, user, currentGroup, socket, ctxMenu, ctxMenuPos, ctxMenuData, setNotificationState }) {
    const [contextMenu, setContextMenu] = ctxMenu
    const [contextMenuPos, setContextMenuPos] = ctxMenuPos
    const [contextMenuData, setContextMenuData] = ctxMenuData
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
        } else if (contextType == 'USER_MANAGER') {
            setContextMenu('USER')
            setContextMenuData({ user: user.manager, target: mainTarget })
        }

        setContextMenuPos({ x, y })
    }

    const currentUser = message.message.data.uid == user.uid
    const currentManager = message.message.data.manager ? message.message.data.manager.uid == user.uid : null

    return (
        <div id={message.id} className={chatStyles.systemMessage} data-timestamp={message.createdAt} data-sender={'system'}
            onContextMenu={(e) => {
                handleContextMenuUser(e, message.message.data)
            }}
        >
            <div className={chatStyles.systemMessageMain}>
                {
                    message.message.type === 'add' ?
                        <i className={`${chatStyles.systemMessageIcon} ${chatStyles.systemMessageIconSuccess}`}>person_add</i> :
                        message.message.type === 'leave' ?
                            <i className={`${chatStyles.systemMessageIcon} ${chatStyles.systemMessageIconErr}`}>arrow_back</i> :
                            message.message.type === 'remove' ?
                                <i className={`${chatStyles.systemMessageIcon} ${chatStyles.systemMessageIconErr}`}>person_remove</i> :
                                message.message.type === 'promote' ?
                                    <i className={`${chatStyles.systemMessageIcon} ${chatStyles.systemMessageIconSuccess}`}>add_moderator</i> :
                                    message.message.type === 'edit-name' ?
                                        <i className={`${chatStyles.systemMessageIcon} ${chatStyles.systemMessageIconWarn}`}>edit</i> :
                                        message.message.type === 'edit-icon' ?
                                            <i className={`${chatStyles.systemMessageIcon} ${chatStyles.systemMessageIconWarn}`}>image</i> :
                                            <i className={`${chatStyles.systemMessageIcon} ${chatStyles.systemMessageIconWarn}`}>info</i>
                }
                <div className={chatStyles.systemMessageContent}>
                    {
                        message.message.type === 'add' ?
                            <><b data-contexttype="USER">{currentUser ? 'you' : `@${message.message.data.username}`}</b> {currentUser ? 'were' : 'was'} added to the group by <b data-contexttype="USER_MANAGER">{currentManager ? 'you' : `@${message.message.data.manager.username}`}</b></> :
                            message.message.type === 'leave' ?
                                <><b data-contexttype="USER">{currentUser ? 'you' : `@${message.message.data.username}`}</b> left the group.</> :
                                message.message.type === 'remove' ?
                                    <><b data-contexttype="USER">{currentUser ? 'you' : `@${message.message.data.username}`}</b> {currentUser ? 'were' : 'was'} removed from the group by <b data-contexttype="USER_MANAGER">{currentManager ? 'you' : `@${message.message.data.manager.username}`}</b></> :
                                    message.message.type === 'promote' ?
                                        <><b data-contexttype="USER">{currentUser ? 'you' : `@${message.message.data.username}`}</b> {currentUser ? 'were' : 'was'} promoted to owner by <b data-contexttype="USER_MANAGER">{currentManager ? 'you' : `@${message.message.data.manager.username}`}</b></> :
                                        message.message.type === 'edit-name' ?
                                            <><b data-contexttype="USER">{currentUser ? 'you' : `@${message.message.data.username}`}</b> updated the group name from "<b>{message.message.data.oldName}</b>" to "<b>{message.message.data.newName}</b>".</> :
                                            message.message.type === 'edit-icon' ?
                                                <><b data-contexttype="USER">{currentUser ? 'you' : `@${message.message.data.username}`}</b> updated the group icon from <img src={message.message.data.oldIcon} /> to <img src={message.message.data.newIcon} />.</> :
                                                <><b data-contexttype="USER">{currentUser ? 'you' : `@${message.message.data.username}`}</b> {currentUser ? 'were' : 'was'} updated.</>
                    }
                </div>
            </div>
            <div className={chatStyles.systemMessageInfo}>
                <div className={chatStyles.systemMessageTS} title={moment(message.createdAt).format('llll')}>{
                    moment(Date.now()).diff(message.createdAt, 'months', true) > 1 ? moment(message.createdAt).format('l') : moment(message.createdAt).fromNow()
                }</div>
            </div>
        </div>
    )
}