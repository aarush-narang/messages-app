import Head from "next/head";
import styles from "../styles/Home.module.css";
import * as cookie from 'cookie'
import { HomeHeader } from "./components/header";
import { csrf } from "../lib/middleware";
import { ChatComponent, ContextMenu, GroupsComponent, PageLoading } from "./components/chatComponents";
import { useState, useEffect } from "react";
import io from "socket.io-client";
import jsCookie from "js-cookie";
import { useRefetchToken } from "./components/util";

export default function Home({ data, csrfToken }) {
    if (!data.account_status) {
        return (
            <>
                <HomeHeader title={""} signedIn={false} />
                <div className={styles.container}>
                    <Head>
                        <title>Messages</title>
                    </Head>

                </div>
            </>

        );
    } else {
        // current group chat selected
        const [currentGroup, setCurrentGroup] = useState(null)
        const [groups, setGroups] = useState(null)
        const msgsState = useState([])
        const [user, setUser] = useState(null)
        const [socket, setSocket] = useState(null); // initialize socket connection to server
        const [contextMenu, setContextMenu] = useState(null)
        const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 })
        const [contextMenuData, setContextMenuData] = useState(null)

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
                            console.log('connected client socket')

                            // initialize data
                            socket.emit('init-server', jsCookie.get('accessToken'), (data) => {
                                setGroups(data.groups)
                                setUser(data.user)
                            })
                        })
                    })
                })
            }, 2000)
        }, [])

        if (loading || !groups || !user) {
            return (
                <PageLoading />
            )
        }

        return (
            <div
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
                    setContextMenuData(mainTarget)
                }}
                onClick={(e) => { // close context menu if it is not clicked on
                    const path = e.nativeEvent.composedPath()
                    const mainTarget = path.find(p => p.dataset && p.dataset.contexttype)
                    const contextType = mainTarget ? mainTarget.dataset.contexttype : 'NONE'
                    if (contextMenu && contextType !== 'MENU') {
                        setContextMenu(null)
                        setContextMenuData(null)
                    }
                }}
            >
                <Head>
                    <title>{currentGroup && currentGroup.name ? currentGroup.name : 'Messages'}</title>
                </Head>
                <HomeHeader title={currentGroup && currentGroup.name ? currentGroup.name : 'Messages'} signedIn={true} csrfToken={csrfToken} />
                <div className={styles.container}>
                    {/* group chat selection */}
                    <GroupsComponent csrfToken={csrfToken} groups={groups} currentGroup={currentGroup} user={user} socket={socket} />
                    {/* chat area */}
                    <ChatComponent csrfToken={csrfToken} groups={groups} currentGroup={currentGroup} user={user} msgsState={msgsState} socket={socket} />
                </div>
                <ContextMenu type={contextMenu} x={contextMenuPos.x} y={contextMenuPos.y} data={contextMenuData} currentGroup={currentGroup} />
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