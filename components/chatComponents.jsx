// Styles
import chatStyles from "../styles/ChatStyles/ChatComponentStyles.module.css";
import groupStyles from "../styles/ChatStyles/GroupComponentStyles.module.css";
import friendStyles from "../styles/ChatStyles/FriendComponentsStyles.module.css";
import fileStyles from "../styles/FileViews/FileViews.module.css";
import modalStyles from "../styles/ChatStyles/ModalComponentStyles.module.css";
// Util + React Hooks + Components
import { useState, useEffect, useRef, useMemo } from "react";
import { useDebounce, shortenName, formatBytes, calculateFileSize, useReferredState } from "./util";
import { MultiSelect, Spinner } from "./formComponents";
import { AttachedFileView, AudioFileView, DefaultFileView, ImageFileView, TextFileView, VideoFileView } from './fileViewComponents'
// Util Packages
import jsCookie from "js-cookie";
import moment from "moment";

const SPINNER_COLOR = '#2e8283'
export const MAX_FILE_SIZE_BYTES = 50 * (1024 * 1024); // 50 MB in bytes
export const MAX_MESSAGE_LEN = 6000
export const MINIMUM_GROUP_NAME_LENGTH = 5
export const MINIMUM_GROUP_MEMBERS_SELECTED = 1
export const MAXIMUM_GROUP_NAME_LENGTH = 20
// Main Components For Chat
// Group Components
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
export function Group({ group, user, currentGroup, ctxMenu, ctxMenuPos, ctxMenuData }) {
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
                    history.pushState({ currentGroup: group.id }, null, `/groups/${group.id}`)
                    dispatchEvent(new PopStateEvent('popstate', { state: { currentGroup: group.id } }))
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
                setContextMenuData({ groupId: group.id })
            }}
        >
            <div className={groupStyles.groupImage}>
                <img title={`${group.name}'s icon`} src={group.icon} loading={"lazy"} className={groupStyles.groupImage} alt={`${group.name}'s icon`} />
            </div>
            <div className={groupStyles.groupInfo}>
                <div className={groupStyles.groupTitleContainer}>
                    <h4 title={group.name} className={groupStyles.groupTitle}>{shortenName(group.name)}</h4>
                    {
                        group.owner == user.uid ?
                            <svg width="20" height="20" viewBox="0 0 16 16">
                                <path fillRule="evenodd" clipRule="evenodd" d="M13.6572 5.42868C13.8879 5.29002 14.1806 5.30402 14.3973 5.46468C14.6133 5.62602 14.7119 5.90068 14.6473 6.16202L13.3139 11.4954C13.2393 11.7927 12.9726 
                          12.0007 12.6666 12.0007H3.33325C3.02725 12.0007 2.76058 11.792 2.68592 11.4954L1.35258 6.16202C1.28792 5.90068 1.38658 5.62602 1.60258 5.46468C1.81992 5.30468 
                          2.11192 5.29068 2.34325 5.42868L5.13192 7.10202L7.44592 3.63068C7.46173 3.60697 7.48377 3.5913 7.50588 3.57559C7.5192 3.56612 7.53255 3.55663 7.54458 3.54535L6.90258 
                          2.90268C6.77325 2.77335 6.77325 2.56068 6.90258 2.43135L7.76458 1.56935C7.89392 1.44002 8.10658 1.44002 8.23592 1.56935L9.09792 2.43135C9.22725 2.56068 9.22725 2.77335 
                          9.09792 2.90268L8.45592 3.54535C8.46794 3.55686 8.48154 3.56651 8.49516 3.57618C8.51703 3.5917 8.53897 3.60727 8.55458 3.63068L10.8686 7.10202L13.6572 5.42868ZM2.66667 
                          12.6673H13.3333V14.0007H2.66667V12.6673Z" fill="currentColor" aria-hidden="true"></path>
                            </svg>
                            :
                            null
                    }
                </div>
                <div title={`Members: ${group.members.length}`} className={groupStyles.numOfMembers}>Members: {group.members.length}</div>
            </div>
            <div className={groupStyles.lastMsg}></div>
        </div>
    )
}
// Friend Components
export function CurrentFriend({ friend, groups, socket, setNotificationState }) {
    const mutualGroupIcons = groups.filter(group => {
        if (group.members.find(member => member.uid == friend.uid)) {
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
export function IncomingFriend({ friend, groups, socket, setNotificationState }) {
    const mutualGroupIcons = groups.filter(group => {
        if (group.members.find(member => member.uid == friend.uid)) {
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
                            socket.emit('friendRequestManage-server', { accessToken: jsCookie.get('accessToken'), friend, status: { action: 'accept', state: 'incoming' } }, (data) => {
                                if (data.error) setNotificationState({ state: 'error', data: { message: data.error } })
                                else if (data.success) setNotificationState({ state: 'success', data: { message: data.success } })
                                else setNotificationState({ state: 'success', data: { message: data.success } })
                            })
                        }}
                    >check_circle</button>
                    <button className={`${friendStyles.friendButton} ${friendStyles.friendDecline}`} title={`Decline @${friend.username}'s friend request`}
                        onClick={() => {
                            socket.emit('friendRequestManage-server', { accessToken: jsCookie.get('accessToken'), friend, status: { action: 'decline', state: 'incoming' } }, (data) => {
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
        if (group.members.find(member => member.uid == friend.uid)) {
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
// Chat/Message Components
export function ChatComponent({ groups, currentGroupId, messageId, user, msgsState, socket, ctxMenu, ctxMenuPos, ctxMenuData, setNotificationState }) {
    if (currentGroupId && !(groups.find(group => group.id == currentGroupId))) {
        return (
            <></>
        )
    }
    if (!currentGroupId) return <NoGroupSelected />;

    const currentGroup = useMemo(() => groups.find(group => group.id == currentGroupId), [groups, currentGroupId])
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
    const [messageLinkComplete, setMessageLinkComplete] = useState(false) // if the message that the user is trying to go to has been scrolled to already, don't scroll again
    const messageInputRef = useRef(null)
    const messageSubmitRef = useRef(null)
    function scrollMessagesDiv(pos = null, behavior) {
        const msgsContainer = document.querySelector(`.${chatStyles.messages}`)
        msgsContainer.scrollTo({ top: pos ? pos : msgsContainer.scrollHeight, behavior: behavior ? behavior : 'auto' }) // smooth scrolling not working: FIX
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
    
    // for message links
    useEffect(() => {
        // check if messsage has already loaded, if not, send socket message to loadmessages-server to load messages, if it has, scroll to message and add some sort of highlight to the message
        if(messageLinkComplete) return;
        const grpMessages = messages.find(grp => grp.id === currentGroup.id)
        if (grpMessages) {
            const messageCheck = grpMessages.messages.find(msg => msg.id == messageId)
            if (messageCheck) {
                if (messageId) setMsgsLoading([currentGroup.id].concat(msgsLoading))
                const mId = messageCheck.id
                const mElement = document.getElementById(mId)
                if (mElement) {
                    scrollMessagesDiv(mElement.offsetTop, 'smooth')
                    setMessageLinkComplete(true)
                    mElement.classList.add(chatStyles.highlight)
                    setTimeout(() => {
                        mElement.classList.remove(chatStyles.highlight)
                    }, 3000)
                }
            } else {
                if (messageId) setMsgsLoading([currentGroup.id].concat(msgsLoading))
            }
        }
    }, [messageId, messages])
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
                    const msgs = msgsContainer.querySelectorAll(`[id]`)
                    if (msgs) {
                        const topMsg = [...msgs].find(msg => msg.getBoundingClientRect().top > 0)
                        if (topMsg) {
                            topMsg.ref = topEl
                            topEl.current = topMsg
                        }
                    }

                    // set the new messages + the old messages
                    setMessages(newMsgsObj)

                    if (topEl.current) topEl.current.scrollIntoView()
                }
                else setMaxMessages([currentGroup.id].concat(maxMessages))
                setMsgsLoading(msgsLoading.filter(grp => grp !== currentGroup.id))
            })
        }
    }, [msgsLoading])

    useEffect(() => {
        if (messages.length <= 0) return;
        socket.on('messageCreate-client', (msg) => {
            const msgsContainer = document.querySelector(`.${chatStyles.messages}`)
            const scrollCond = msgsContainer ? msgsContainer.scrollTop == msgsContainer.scrollHeight - msgsContainer.clientHeight : false

            const files = msg.message.message.attachments
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
            if ((currentGroup.id == msg.groupId && scrollCond) || (msg.message.author && msg.message.author.uid == user.uid)) {
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
    }, [messages.length])

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
                }, 0.001);
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
                            if (!message.system) {
                                return (
                                    <Message key={message.id} message={message} user={user} socket={socket} ctxMenu={ctxMenu} ctxMenuPos={ctxMenuPos} ctxMenuData={ctxMenuData} currentGroup={currentGroup} setNotificationState={setNotificationState} />
                                )
                            } else {
                                return (
                                    <SystemMessage key={message.id} message={message} user={user} socket={socket} ctxMenu={ctxMenu} ctxMenuPos={ctxMenuPos} ctxMenuData={ctxMenuData} currentGroup={currentGroup} setNotificationState={setNotificationState} />
                                )
                            }
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
                    onClick={(e) => {
                        messageInputRef.current.focus()
                    }}
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
                            attachments: formFiles,
                            content: msgInput.innerText
                        }

                        // remove empty values
                        if (formDataObj.files && formDataObj.files.size === 0) formDataObj.files = []
                        // confirm message length
                        if (formDataObj.content.length > MAX_MESSAGE_LEN) {
                            return setNotificationState({ state: 'error', data: { message: 'Your message is too long!' } })
                        } else if (formDataObj.content.trim().length === 0 && formDataObj.attachments.length === 0) {
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
                        <button type={"submit"} className={chatStyles.messageInputSubmit} ref={messageSubmitRef}>send</button>
                    </div>

                    <div className={chatStyles.messageTextContainer} data-length="0" data-overflow="">
                        <div className={chatStyles.contentEditableMessageAreaContainer}>
                            <div data-name={'content'} className={chatStyles.contentEditableMessageArea} ref={messageInputRef} contentEditable={true} role="textbox" data-placeholder={`Message ${currentGroup.members.length == 2 ? '@' : ''}${currentGroup.name}`}
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
                                        messageSubmitRef.current.click() // submit form
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

    const [messageEditOverflow, setMessageEditOverflow] = useReferredState(false) // false, warn, error
    const [messageEditLength, setMessageEditLength] = useReferredState(0) // length of message when overflowing

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
    function handleContextMenuUser(e, user, x, y) {
        e.preventDefault()
        const path = e.nativeEvent.composedPath()
        const mainTarget = path.find(p => p.dataset && p.dataset.contexttype)
        const contextType = mainTarget ? mainTarget.dataset.contexttype : 'NONE'

        if (contextType == 'MENU') return

        setContextMenu(contextType)
        setContextMenuPos({ x, y })
        setContextMenuData({ user, target: mainTarget })
    }
    function handleMessageEdit(message) {
        const newText = messageEditDivRef.current.innerText.trim()
        setMessageEdit(false)
        if (newText.length > MAX_MESSAGE_LEN) return setNotificationState({ state: 'error', data: { message: `Message is too long. Max length is ${MAX_MESSAGE_LEN} characters.` } })
        else if (newText.length == 0) return setNotificationState({ state: 'error', data: { message: 'Message cannot be empty.' } })
        else if (message.message.content == newText) return
        else {
            socket.emit('messageEdit-server', { groupId: currentGroup.id, messageId: message.id, newMessage: newText, accessToken: jsCookie.get('accessToken') }, (res) => {
                if (!res) console.log('error, unable to edit message')
                setNotificationState({ state: 'warning', data: { message: 'Message Edited' } })
            })
        }
    }

    return (
        <div id={message.id} data-contexttype="MESSAGE" className={chatStyles.message} data-timestamp={message.createdAt} data-sender={message.author.uid == user.uid}
            onContextMenu={(e) => {
                const path = e.nativeEvent.composedPath()
                const mainTarget = path.find(p => p.dataset && p.dataset.contexttype)
                const contextType = mainTarget ? mainTarget.dataset.contexttype : 'NONE'

                const clientX = e.clientX
                const clientY = e.clientY

                if (contextType == 'MESSAGE') {
                    handleContextMenuMessage(e, message, clientX, clientY)
                }
                else if (contextType == 'USER') {
                    handleContextMenuUser(e, message.author, clientX, clientY)
                }
            }}
        >
            <img data-contexttype="USER" className={chatStyles.messageIcon} src={message.author.icon} loading={"lazy"} alt={`${message.author.username}'s icon`} />

            <div className={chatStyles.messageContainer}>
                <div className={chatStyles.messageHeader}>
                    <h4 className={chatStyles.messageAuthor} data-contexttype="USER">{message.author.username}</h4>
                    <div className={chatStyles.messageInfo}>
                        <div className={chatStyles.messageInfoSect}>
                            <span className={chatStyles.messageTS} title={moment(message.createdAt).format('llll')}>{
                                moment(Date.now()).diff(message.createdAt, 'months', true) > 1 ? moment(message.createdAt).format('l') : moment(message.createdAt).fromNow()
                            }</span>
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
                                        data-length={messageEditLength}
                                        data-overflow={messageEditOverflow}
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

                                        onPaste={(e) => {
                                            e.preventDefault()
                                            const text = e.clipboardData.getData('text/plain')
                                            document.execCommand('insertText', false, text)
                                            e.target.scrollTop = e.target.scrollHeight * 1000
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key == 'Escape') {
                                                setMessageEdit(false)
                                            }
                                            else if (e.key == 'Enter' && !e.shiftKey) {
                                                e.preventDefault()
                                                handleMessageEdit(message)
                                            }
                                        }}
                                        onInput={(e) => {
                                            if (e.target.innerText.length > MAX_MESSAGE_LEN) {
                                                setMessageEditOverflow('error')
                                                setMessageEditLength(e.target.innerText.length)
                                            } else if (e.target.innerText.length > MAX_MESSAGE_LEN - 500) {
                                                setMessageEditOverflow('warn')
                                                setMessageEditLength(e.target.innerText.length)
                                            } else {
                                                setMessageEditOverflow(false)
                                                setMessageEditLength('')
                                            }
                                        }}
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
                                            <kbd onClick={(e) => {
                                                handleMessageEdit(message)
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
                            message.message.attachments?.map((fileInfo, i) => {
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
export function SystemMessage({ message, user, currentGroup, socket, ctxMenu, ctxMenuPos, ctxMenuData, setNotificationState }) {
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
