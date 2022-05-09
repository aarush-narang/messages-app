import Head from "next/head";
import { csrf } from "../../lib/middleware";
import { FormPagesHeader, HomeHeader } from "../components/header";
import { GroupsComponent, ChatComponent, PageLoading } from "../components/chatComponents";
import styles from "../../styles/Home.module.css";
import * as cookie from 'cookie'
import { useRouter } from 'next/router'
import { useState, useEffect } from "react";
import { useRefetchToken } from "../components/util";
import jsCookie from "js-cookie";
import io from "socket.io-client";

export default function Groups({ data, csrfToken }) {
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
        // current group id
        const router = useRouter()
        const { groupid } = router.query

        // current group chat selected
        const [currentGroup, setCurrentGroup] = useState(null)
        useEffect(() => {
            window.addEventListener('popstate', (e) => {
                setCurrentGroup(e.state.currentGroup)
            })
        }, [])

        // data
        const [groups, setGroups] = useState(null)
        const msgsState = useState([])
        const [user, setUser] = useState(null)
        const [socket, setSocket] = useState(null); // initialize socket connection to server

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
                            console.log('connected client socket')

                            // initialize data
                            socket.emit('init-server', jsCookie.get('accessToken'), (data) => {
                                setGroups(data.groups)
                                setUser(data.user)

                                const current = data.groups.find(g => g.id == groupid)
                                setCurrentGroup(current)
                            })
                        })
                    })
                })
            }, 2000)
        }, [])

        if(loading) {
            return (
                <PageLoading />
            )
        }
        else if (!groups || !user || !(groups.find(group => group.id == groupid))) {
            return (
                <div>
                    <FormPagesHeader />
                    <PageLoading />
                </div>
            )
        }


        return (
            <div style={{ overflowY: 'hidden' }}>
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