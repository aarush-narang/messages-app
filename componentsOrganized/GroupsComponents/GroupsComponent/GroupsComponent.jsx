export function GroupsComponent({ groupsState, currentGroupId, userState, socket, ctxMenu, ctxMenuPos, ctxMenuData, setNotificationState, setFullModalState, friendsOptions }) {
    const [groups, _setGroups] = groupsState
    const groupsRef = useRef(groups).current
    const setGroups = (data) => {
        _setGroups(data)
        groupsRef = data
    }
    const currentGroup = useMemo(() => groups.find(group => group.id == currentGroupId), [groups, groupsRef, currentGroupId])

    const [user, setUser] = userState

    const [setModalState, setModalContent] = setFullModalState
    const createGroupNameRef = useRef(null)
    const createGroupMembers = useRef([])

    // start the groups menu open or closed
    const [menuState, setMenuState] = useState(false); // true = closed, false = open

    // Tab States
    const [tabState, setTabState] = useState('groups'); // groups or friends
    const [friendsTabState, setFriendsTabState] = useState('current'); // current, incoming, or outgoing
    const addFriendsTextboxRef = useRef(null);

    useEffect(() => {
        setMenuState(window.innerWidth < 900)
        window.addEventListener('resize', () => { if (window.innerWidth < 900) setMenuState(true) })

        // socket listeners
        socket.on('friendRequest-client', (data) => {
            const newUserData = data.data
            setUser({ ...user, friends: newUserData })
        })
        socket.on('groupCreate-client', (data) => {
            const newGroup = data.newGroup
            setGroups(groupsRef.concat(newGroup))
        })
        socket.on('groupEdit-client', (data) => {
            const newGroup = data.newGroup
            const groupId = newGroup.id

            setGroups(groupsRef.map(group => {
                if (group.id == groupId) {
                    return newGroup
                }
                return group
            }))
        })
        socket.on('groupJoin-client', (data) => {
            const newGroup = data.newGroup
            if (groupsRef.find(group => group.id == newGroup.id)) {
                setGroups(groupsRef.map(group => {
                    if (group.id == newGroup.id) {
                        return newGroup
                    }
                    return group
                }))
            } else {
                setGroups(groupsRef.concat(newGroup))
            }
        })
        socket.on('groupLeave-client', (data) => {
            ctxMenu[1](null)
            ctxMenuData[1](null)
            setModalState(false)
            const owner = data.owner
            const groupId = data.groupId
            const newMembers = data.members
            const leaveUserId = data.userId

            for (const group of groupsRef) {
                if (group.id == groupId) {
                    if (user.uid == leaveUserId) {
                        if (history.state.currentGroup && history.state.currentGroup == groupId) { // if the group that was left was selected, group select page
                            history.pushState({ currentGroup: null }, null, '/')
                            dispatchEvent(new PopStateEvent('popstate', { state: { currentGroup: null } }))
                        }
                        setGroups(groupsRef.filter(group => group.id != groupId))
                    } else {
                        setGroups(groupsRef.map(group => {
                            if (group.id == groupId) {
                                return { ...group, members: newMembers, owner: owner ? owner : group.owner }
                            } else {
                                return group
                            }
                        }))
                    }
                }
            }
        })
        socket.on('groupDelete-client', (data) => {
            ctxMenu[1](null)
            ctxMenuData[1](null)
            setModalState(false)
            const groupId = data.groupId

            setGroups(groupsRef.filter(group => group.id != groupId))
            if (history.state.currentGroup && history.state.currentGroup == groupId) { // if the group that was left was selected, group select page
                history.pushState({ currentGroup: null }, null, `/`)
                dispatchEvent(new PopStateEvent('popstate', { state: { currentGroup: null } }))
            }
        })
        socket.on('groupOwnerChange-client', (data) => {
            const groupId = data.groupId
            const newOwner = data.newOwner

            setGroups(groupsRef.map(group => {
                if (group.id == groupId) {
                    return { ...group, owner: newOwner }
                } else {
                    return group
                }
            }))
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
    }, [tabState, groups])

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
            <div className={groupStyles.groupsContainer} style={{ opacity: `${menuState ? '0' : '1'}`, width: `${menuState ? '0px' : '100%'}`, pointerEvents: menuState ? 'none' : 'all' }}>
                <div className={groupStyles.groupTabSwitchContainer}>
                    <button className={groupStyles.groupTabSwitch} data-selected={tabState.toLowerCase() == 'groups'}
                        onClick={() => setTabState('groups')}
                    >Groups</button>
                    <button className={groupStyles.groupTabSwitch} data-selected={tabState.toLowerCase() == 'friends'}
                        onClick={() => setTabState('friends')}
                    >Friends</button>
                </div>
                {
                    tabState.toLowerCase() == 'groups' ?
                        <div className={groupStyles.groups}>
                            {
                                groups.length > 0 ?
                                    groups.map(group => {
                                        if (group.members.find(member => member.uid == user.uid)) {
                                            return (
                                                // group container
                                                <Group key={group.id} group={group} user={user} currentGroup={currentGroup} ctxMenu={ctxMenu} ctxMenuPos={ctxMenuPos} ctxMenuData={ctxMenuData} />
                                            )
                                        }
                                    }) :
                                    <div className={groupStyles.noGroupsContainer}>
                                        <h2 style={{ textAlign: 'center' }}>No Direct Messages or Groups created/joined</h2>
                                    </div>
                            }
                        </div>
                        :
                        <>
                            <div>
                                <div className={groupStyles.friendsHeader}>
                                    <form className={groupStyles.friendsHeaderForm}
                                        onSubmit={(e) => {
                                            e.preventDefault()
                                            const formData = new FormData(e.target)
                                            const friend = formData.get('friends_search')
                                            e.target.reset()
                                            addFriendsTextboxRef.current.focus()
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
                                            ref={addFriendsTextboxRef}
                                        />
                                        <button className={groupStyles.addFriendsButton} type={"submit"}>person_add</button>
                                    </form>
                                </div>
                                <div className={groupStyles.groupTabSwitchContainer}>
                                    <button className={groupStyles.groupTabSwitch} data-selected={friendsTabState.toLowerCase() == 'current'}
                                        onClick={() => setFriendsTabState('current')}
                                    >Current</button>
                                    <button className={groupStyles.groupTabSwitch} data-selected={friendsTabState.toLowerCase() == 'incoming'}
                                        onClick={() => setFriendsTabState('incoming')}
                                    >Incoming</button>
                                    <button className={groupStyles.groupTabSwitch} data-selected={friendsTabState.toLowerCase() == 'outgoing'}
                                        onClick={() => setFriendsTabState('outgoing')}
                                    >Outgoing</button>
                                </div>
                            </div>
                            <div className={groupStyles.friends}>
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
                                                Oh no, you have no friends added! Go to the <a onClick={() => addFriendsTextboxRef.current.focus()}>textbox</a> above and add somebody!
                                            </div>
                                        :
                                        friendsTabState.toLowerCase() == 'incoming' ?
                                            user.friends.incoming.length > 0 ?
                                                user.friends.incoming.map(friend => {
                                                    return (
                                                        // friend container
                                                        <IncomingFriend
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
                                                    You have no incoming friend requests!
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
                                                        You have no outgoing friend requests. Go to the <a onClick={() => addFriendsTextboxRef.current.focus()}>textbox</a> above and add somebody!
                                                    </div>
                                                :
                                                null
                                }
                            </div>
                        </>
                }
                {
                    groups.length >= 0 && tabState == 'groups' ?
                        <div className={groupStyles.joinGroupContainer}>
                            <div className={groupStyles.joinGroup} onClick={() => {
                                setModalState(true)
                                setModalContent(
                                    <>
                                        <form
                                            className={modalStyles.modalContainer}
                                            onSubmit={(e) => {
                                                e.preventDefault()
                                                if (createGroupNameRef.current.value.length < MINIMUM_GROUP_NAME_LENGTH || createGroupNameRef.current.value.length > MAXIMUM_GROUP_NAME_LENGTH) {
                                                    setNotificationState({ state: 'error', data: { message: `Please enter a name with at least ${MINIMUM_GROUP_NAME_LENGTH} characters and at most ${MAXIMUM_GROUP_NAME_LENGTH}.` } })
                                                }
                                                else if (createGroupMembers.current.length < MINIMUM_GROUP_MEMBERS_SELECTED) {
                                                    setNotificationState({ state: 'error', data: { message: `Please select at least ${MINIMUM_GROUP_MEMBERS_SELECTED} friend to add.` } })
                                                }
                                                else {
                                                    const newGroupName = createGroupNameRef.current.value
                                                    const newGroupMembers = createGroupMembers.current.map(member => member.data.uid)

                                                    socket.emit('groupCreate-server', { newGroupName, newGroupMembers, accessToken: jsCookie.get('accessToken') }, (status) => {
                                                        if (status.success) {
                                                            setNotificationState({ state: 'success', data: { message: `Group "${newGroupName}" created!` } })
                                                        }
                                                        else {
                                                            setNotificationState({ state: 'error', data: { message: status.message } })
                                                        }
                                                    })

                                                    setModalState(false)
                                                    createGroupMembers.current = []
                                                }
                                            }}
                                        >
                                            <div className={modalStyles.modalHeader}>
                                                <div className={modalStyles.modalTitle}>Create A Group</div>
                                                <div className={modalStyles.leaveModalDescription}>
                                                    Create a group to send messages to your friends.
                                                </div>
                                            </div>
                                            <div className={modalStyles.modalInput}>
                                                <label htmlFor="groupName" className={modalStyles.modalSuccessText}>Enter the name for the group.</label>
                                                <input name="groupName" id="groupName" type="text" placeholder={"Enter a group name..."} autoComplete="off" ref={createGroupNameRef} />
                                            </div>
                                            <div className={modalStyles.modalInput}>
                                                <label htmlFor="groupName" className={modalStyles.modalSuccessText}>Select the friends you want to add.</label>
                                                <MultiSelect
                                                    options={friendsOptions}
                                                    onChange={(data) => {
                                                        createGroupMembers.current = data
                                                    }}
                                                />
                                            </div>
                                            <div className={modalStyles.modalButtons}>
                                                <button className={modalStyles.modalButton}
                                                    onClick={() => {
                                                        setModalState(false)
                                                        createGroupMembers.current = []
                                                    }}
                                                    type={"button"}
                                                >Cancel</button>
                                                <button className={`${modalStyles.modalButton} ${modalStyles.modalBtnSuccess}`} type={'submit'}>Create Group</button>
                                            </div>
                                        </form>
                                    </>
                                )
                            }}>add_circle</div>
                        </div>
                        :
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