export function ContextMenuComponent({ ctxMenu, ctxMenuPos, ctxMenuData, currentGroup, user, groups, msgsState, socket, setNotificationState, setFullModalState, friendsOptions }) {
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