import Head from "next/head";
import homeStyles from "../styles/Home.module.css";
import * as cookie from 'cookie'
import { HomeHeader } from "./components/header";
import { csrf } from "../lib/middleware";
import { GroupsComponent, ChatComponent, PageLoading } from "./components/chatComponents";
import { FullModalWrapper, MiniNotificationModal } from './components/modalComponents'
import { ContextMenu } from './components/contextMenuComponents'
import { useState, useEffect } from "react";
import io from "socket.io-client";
import jsCookie from "js-cookie";
import { useRefetchToken } from "./components/util";
import Parallax from 'parallax-js';

export default function Home({ data, csrfToken }) {
    if (!data.account_status) {
        useEffect(() => {
            const scene = document.querySelector('[data-parallax-scene]');
            const parallaxInstance = new Parallax(scene);
        }, [])
        return (
            <>
                <HomeHeader title={""} signedIn={false} />
                <div className={homeStyles.container}>
                    <Head>
                        <title>Messages</title>
                    </Head>
                    <div data-parallax-scene className={homeStyles.scene}>
                        <pre>
                            
                        </pre> 
                    </div>
                </div>
            </>

        );
    } else {
        // current group chat selected
        const [currentGroup, setCurrentGroup] = useState(null)
        const [groups, setGroups] = useState(null)
        const msgsState = useState([])
        const [socket, setSocket] = useState(null); // initialize socket connection to server
        const [user, setUser] = useState(null)

        // Context Menu States
        const ctxMenu = useState(null)
        const ctxMenuPos = useState({ x: 0, y: 0 })
        const ctxMenuData = useState(null)

        // Modal States
        const [notificationModalState, _setNotificationModalState] = useState({ state: 'null', data: null }) // null = closed, success = green, warning = yellow, error = red

        function setNotificationModalState(newData) {
            if (notificationModalState.state != 'null') {
                _setNotificationModalState({ state: `null ${notificationModalState.state}`, data: notificationModalState.data })
                setTimeout(() => {
                    _setNotificationModalState(newData)
                }, 450);
            } else {
                _setNotificationModalState(newData)
            }
        }

        useEffect(() => {
            window.addEventListener('popstate', (e) => {
                setCurrentGroup(e.state.currentGroup)
            })
        }, [])

        // socket connection
        const [loading, setLoading] = useState(true)
        // TODO: add new state that tells whether request for socket failed or not and if it did, show error message and keep trying to connect
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
                                setGroups(data.groups)
                                setUser(data.user)
                            })
                        })
                        socket.on('connection_error', (err) => {
                            console.log(err)
                            // failed
                            setLoading(true)
                        })
                        socket.on('disconnect', () => {

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
            }, 2000)
        }, [])

        if (loading || !groups || !user) {
            return (
                <PageLoading />
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
                    if (ctxMenu[0] && e.target.dataset.contexttype != 'MENU' && e.target.dataset.type != 'OPTIONS') {
                        ctxMenu[1](null)
                        ctxMenuData[1](null)
                    }
                }}
            >
                <Head>
                    <title>{currentGroup && currentGroup.name ? currentGroup.name : 'Messages'}</title>
                </Head>
                <HomeHeader title={currentGroup && currentGroup.name ? currentGroup.name : 'Messages'} signedIn={true} csrfToken={csrfToken} user={user} />
                <div className={homeStyles.container}>
                    {/* group chat selection */}
                    <GroupsComponent
                        csrfToken={csrfToken}
                        groups={groups}
                        currentGroup={currentGroup}
                        userState={[user, setUser]}
                        socket={socket}
                        ctxMenu={ctxMenu}
                        ctxMenuPos={ctxMenuPos}
                        ctxMenuData={ctxMenuData}
                        setNotificationState={setNotificationModalState}
                    />
                    {/* chat area */}
                    <ChatComponent
                        csrfToken={csrfToken}
                        groups={groups}
                        currentGroup={currentGroup}
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
                    type={ctxMenu[0]}
                    x={ctxMenuPos[0].x}
                    y={ctxMenuPos[0].y}
                    data={ctxMenuData[0]}
                    currentGroup={currentGroup}
                    user={user}
                    msgsState={msgsState}
                    socket={socket}
                    setNotificationState={setNotificationModalState}
                />
                {
                    !notificationModalState.state.includes('null') ?
                        <MiniNotificationModal state={notificationModalState} setState={setNotificationModalState} />
                        : null
                }
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