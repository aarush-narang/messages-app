export function UserContextMenuComponent({ group, user, socket, data, setNotificationState, setFullModalState }) {
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