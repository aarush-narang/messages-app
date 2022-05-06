import Head from "next/head";
import styles from "../styles/Home.module.css";
import * as cookie from 'cookie'
import { HomeHeader } from "./components/header";
import { csrf } from "../lib/middleware";
import { ChatComponent, GroupsComponent, PageLoading } from "./components/chatComponents";
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
        const [user, setUser] = useState(null)

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

                        socket.on('connect', () => {
                            // loaded
                            setLoading(false)
                            console.log('connected client socket')

                            // initialize data
                            socket.emit('init', jsCookie.get('accessToken'), (data) => {
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
            <div>
                <Head>
                    <title>{currentGroup && currentGroup.name ? currentGroup.name : 'Messages'}</title>
                </Head>
                <HomeHeader title={currentGroup && currentGroup.name ? currentGroup.name : 'Messages'} signedIn={true} csrfToken={csrfToken} />
                <div className={styles.container}>
                    {/* group chat selection */}
                    <GroupsComponent csrfToken={csrfToken} groups={groups} currentGroup={currentGroup} user={user} />
                    {/* chat area */}
                    <ChatComponent csrfToken={csrfToken} groups={groups} currentGroup={currentGroup} user={user} />
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
    if (cookies.accessToken) {
        return {
            props: { // return props here
                data: {
                    account_status: true,
                },
                csrfToken
            }
        }
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