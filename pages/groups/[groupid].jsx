import Head from "next/head";
import { csrf } from "../../lib/middleware";
import { FormPagesHeader, HomeHeader } from "../../components/header";
import { GroupsComponent, ChatComponent, PageLoading } from "../../components/chatComponents";
import { FullModalWrapper, MiniNotificationModal } from '../../components/modalComponents'
import { ContextMenu } from '../../components/contextMenuComponents'
import homeStyles from "../../styles/Home.module.css";
import * as cookie from 'cookie'
import { useRouter } from 'next/router'
import { useState, useEffect, useMemo } from "react";
import { useRefetchToken } from "../../components/util";
import jsCookie from "js-cookie";
import io from "socket.io-client";

export default function Groups({ data, csrfToken }) {
    if (!data.account_status) {
        return (
            <>
                <HomeHeader title={""} signedIn={false} />
                <div className={homeStyles.container}>
                    <Head>
                        <title>Messages</title>
                    </Head>
                </div>
            </>

        );
    } else {
        // current group id
        const router = useRouter()
        const { groupid } = router.query

        // current group chat selected
        const [currentGroupId, setCurrentGroup] = useState(null)
        useEffect(() => {
            window.addEventListener('popstate', (e) => {
                setCurrentGroup(e.state.currentGroup)
            })
        }, [])

        // data
        const [groups, setGroups] = useState(null)
        const currentGroup = useMemo(() => groups ? groups.find(group => group.id === currentGroupId) : null, [groups, currentGroupId])
        const msgsState = useState([])
        const [socket, setSocket] = useState(null); // initialize socket connection to server
        const [user, setUser] = useState(null)

        const friendsOptions = useMemo(() => {
            return user ? user.friends.current
                .map((friend) => {
                    return {
                        text: friend.username,
                        data: {
                            uid: friend.uid,
                        },
                        icon: friend.icon
                    }
                }) : []
        }, [user, groups])

        // Context Menu States
        const ctxMenu = useState(null)
        const ctxMenuPos = useState({ x: 0, y: 0 })
        const ctxMenuData = useState(null)

        // Modal States
        // Notification Modal State
        const [notificationModalState, _setNotificationModalState] = useState({ state: 'null', data: null }) // null = closed, success = green, warning = yellow, error = red
        function setNotificationModalState(newData) {
            if (notificationModalState.state != 'null') {
                _setNotificationModalState({ state: `close ${notificationModalState.state}`, data: notificationModalState.data })
                setTimeout(() => {
                    _setNotificationModalState(newData)
                }, 450);
            } else {
                _setNotificationModalState(newData)
            }
        }
        // Full Modal State
        const [fullModalState, _setFullModalState] = useState(false)
        const [fullModalContent, setFullModalContent] = useState(null)
        const setFullModalState = (newState) => {
            if (!newState) {
                _setFullModalState(false)
                setTimeout(() => {
                    setFullModalContent(null)
                }, 200);
            } else {
                _setFullModalState(true)
            }
        }
        const closeModal = () => {
            setFullModalState(false)
        }

        // socket connection
        const [loading, setLoading] = useState(true)
        useEffect(() => {
            setTimeout(async () => {
                await useRefetchToken(async () => {
                    return await fetch('/api/v1/socket/socket', {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${jsCookie.get('accessToken')}`
                        }
                    }).finally(() => {
                        const socket = io()
                        setSocket(socket)
                        socket.on('connect', () => {
                            // loaded
                            setLoading(false)

                            // initialize data
                            socket.emit('init-server', jsCookie.get('accessToken'), (data) => {
                                if (!data) {
                                    setLoading(true)
                                    jsCookie.remove('accessToken')
                                    jsCookie.remove('refreshToken')
                                    window.location.reload()
                                    return
                                }
                                setGroups(data.groups.sort((a, b) => a.order - b.order))
                                setUser(data.user)

                                const current = data.groups.find(g => g.id == groupid)
                                if (current) {
                                    setCurrentGroup(current.id)
                                    history.pushState({ currentGroup: current.id }, null, `/groups/${current.id}`)
                                }
                            })
                        })
                        socket.on('disconnect', (err) => {
                            setLoading(true)
                        })
                    })
                }).then(r => {
                    if (r.status != 200) {
                        console.log(r)
                        jsCookie.remove('accessToken')
                        jsCookie.remove('refreshToken')
                        window.location = '/'
                    }
                })
            }, 1000)
        }, [])

        if (loading) {
            return (
                <PageLoading />
            )
        }
        else if (!groups || !user) {
            return (
                <div>
                    <FormPagesHeader />
                    <PageLoading />
                </div>
            )
        }

        return (
            <div className={homeStyles.contentContainer}
                onContextMenu={(e) => { // prevent context menu from showing when messages/groups/users are not clicked
                    e.preventDefault()

                    const path = e.nativeEvent.composedPath()
                    const mainTarget = path.find(p => p.dataset && p.dataset.contexttype)
                    const contextType = mainTarget ? mainTarget.dataset.contexttype : 'NONE'

                    if (contextType == 'NONE') {
                        ctxMenu[1](null)
                        ctxMenuData[1](null)
                    }
                }}
                onClick={(e) => { // close context menu if it is open
                    const path = e.nativeEvent.composedPath()
                    const mainTarget = path.find(p => p.dataset && p.dataset.contexttype)
                    const contextType = mainTarget ? mainTarget.dataset.contexttype : 'NONE'

                    if (ctxMenu[0] && e.target.dataset.contexttype != 'MENU' && e.target.dataset.type != 'OPTIONS' && contextType != 'OPTIONS') {
                        ctxMenu[1](null)
                        ctxMenuData[1](null)
                    }
                }}
            >
                <Head>
                    <title>{currentGroup && currentGroup.name ? currentGroup.name : 'Messages'}</title>
                </Head>
                <HomeHeader
                    title={currentGroup && currentGroup.name ? currentGroup.name : 'Messages'}
                    signedIn={true}
                    csrfToken={csrfToken}
                    user={user}
                />
                <div className={homeStyles.container}>
                    {/* group chat selection */}
                    <GroupsComponent
                        csrfToken={csrfToken}
                        groupsState={[groups, setGroups]}
                        currentGroupId={currentGroupId}
                        userState={[user, setUser]}
                        socket={socket}
                        ctxMenu={ctxMenu}
                        ctxMenuPos={ctxMenuPos}
                        ctxMenuData={ctxMenuData}
                        setNotificationState={setNotificationModalState}
                        setFullModalState={[setFullModalState, setFullModalContent]}
                        friendsOptions={friendsOptions}
                    />
                    {/* chat area */}
                    <ChatComponent
                        csrfToken={csrfToken}
                        groups={groups}
                        currentGroupId={currentGroupId}
                        user={user}
                        msgsState={msgsState}
                        socket={socket}
                        ctxMenu={ctxMenu}
                        ctxMenuPos={ctxMenuPos}
                        ctxMenuData={ctxMenuData}
                        setNotificationState={setNotificationModalState}
                    />
                </div>
                <ContextMenu
                    ctxMenu={ctxMenu}
                    ctxMenuPos={ctxMenuPos}
                    ctxMenuData={ctxMenuData}
                    currentGroup={currentGroup}
                    user={user}
                    groups={groups}
                    msgsState={msgsState}
                    socket={socket}
                    setNotificationState={setNotificationModalState}
                    setFullModalState={[setFullModalState, setFullModalContent]}
                    friendsOptions={friendsOptions}
                />
                {
                    !notificationModalState.state.includes('null') ?
                        <MiniNotificationModal state={notificationModalState} setState={setNotificationModalState} />
                        : null
                }
                <FullModalWrapper modalIsOpen={fullModalState} closeModal={closeModal}>
                    {fullModalContent}
                </FullModalWrapper>
            </div>
        );
    }

}

export async function getServerSideProps(ctx) {
    const { req, res } = ctx
    // CSRF token
    await csrf(req, res)
    const csrfToken = req.csrfToken()
    // Access/Refresh Tokens
    const token = ctx.req.headers.cookie;
    const cookies = cookie.parse(token ? token : '');
    if (cookies.accessToken && cookies.refreshToken) {
        return {
            props: { // return props here
                data: {
                    account_status: true,
                },
                csrfToken
            }
        }
    } else {
        ctx.res.setHeader('set-cookie', [
            'accessToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT;',
            'refreshToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT;'
        ])
    }

    return {
        props: {
            data: {
                account_status: false,
            },
            csrfToken
        }
    }
}