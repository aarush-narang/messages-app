export function GroupContextMenuComponent({ groups, user, data, socket, setNotificationState, setFullModalState, friendsOptions, ctxMenu, ctxMenuPos, ctxMenuData }) {
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
                                                    <div className={modalStyles.modalViewMembersItemName}>
                                                        <b data-contexttype="USER">@{member.username}</b>
                                                        {
                                                            group.owner == member.uid ?
                                                                <svg width="20" height="20" viewBox="0 0 16 16">
                                                                    <path fillRule="evenodd" clipRule="evenodd"
                                                                        d="M13.6572 5.42868C13.8879 5.29002 14.1806 5.30402 14.3973 5.46468C14.6133 5.62602 14.7119 5.90068 14.6473 6.16202L13.3139 11.4954C13.2393 11.7927 12.9726 
                                                    12.0007 12.6666 12.0007H3.33325C3.02725 12.0007 2.76058 11.792 2.68592 11.4954L1.35258 6.16202C1.28792 5.90068 1.38658 5.62602 1.60258 5.46468C1.81992 5.30468 
                                                    2.11192 5.29068 2.34325 5.42868L5.13192 7.10202L7.44592 3.63068C7.46173 3.60697 7.48377 3.5913 7.50588 3.57559C7.5192 3.56612 7.53255 3.55663 7.54458 3.54535L6.90258 
                                                    2.90268C6.77325 2.77335 6.77325 2.56068 6.90258 2.43135L7.76458 1.56935C7.89392 1.44002 8.10658 1.44002 8.23592 1.56935L9.09792 2.43135C9.22725 2.56068 9.22725 2.77335 
                                                    9.09792 2.90268L8.45592 3.54535C8.46794 3.55686 8.48154 3.56651 8.49516 3.57618C8.51703 3.5917 8.53897 3.60727 8.55458 3.63068L10.8686 7.10202L13.6572 5.42868ZM2.66667 
                                                    12.6673H13.3333V14.0007H2.66667V12.6673Z" fill="currentColor" aria-hidden="true"></path>
                                                                </svg>
                                                                :
                                                                null
                                                        }
                                                        {member.uid == user.uid ? '(you)' : ''}
                                                    </div>
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
                                    return setNotificationState({ state: 'error', data: { message: `Please enter a name with at least ${MINIMUM_GROUP_NAME_LENGTH} characters and at most ${MAXIMUM_GROUP_NAME_LENGTH}.` } })
                                } else if (inputValue === groupName) {
                                    return setNotificationState({ state: 'error', data: { message: 'New name cannot be the same as the previous one.' } })
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