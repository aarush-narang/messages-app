import Head from "next/head";
import { csrf } from "../../lib/middleware";
import { FormPagesHeader, HomeHeader } from "../components/header";
import { GroupsComponent, ChatComponent } from "../components/chatComponents";
import styles from "../../styles/Home.module.css";
import * as cookie from 'cookie'
import { useRouter } from 'next/router'
import { useState, useEffect } from "react";
import { Spinner } from "../components/inputComponents";

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
        if (!data.data) {
            return (
                <>
                    <FormPagesHeader />
                    <div style={{ width: '100%', height: '90%', display: "flex", justifyContent: "center", alignItems: "center", position: 'absolute' }}>
                        <Spinner color={'#2e8283'} height={'80px'} width={'80px'} thickness={'8px'} animationDuration={'1s'} animationTimingFunction={'cubic-bezier(0.62, 0.27, 0.08, 0.96)'} />
                    </div>
                </>
            )
        }
        const groups = data.data

        // current group id
        const router = useRouter()
        const { groupid } = router.query

        // current group chat selected
        if (!(groups.find(group => group.id == groupid))) {
            return (
                <>
                    <FormPagesHeader />
                    <div style={{ width: '100%', height: '90%', display: "flex", justifyContent: "center", alignItems: "center", position: 'absolute' }}>
                        <Spinner color={'#2e8283'} height={'80px'} width={'80px'} thickness={'8px'} animationDuration={'1s'} animationTimingFunction={'cubic-bezier(0.62, 0.27, 0.08, 0.96)'} />
                    </div>
                </>
            )
        }
        const [currentGroup, setCurrentGroup] = useState({ id: groupid, name: groups.find(g => g.id == groupid).name })

        useEffect(() => {
            window.addEventListener('popstate', (e) => {
                setCurrentGroup(e.state.currentGroup)
            })
        }, [])

        return (
            <div>
                <Head>
                    <title>{currentGroup && currentGroup.name ? currentGroup.name : 'Messages'}</title>
                </Head>
                <HomeHeader title={currentGroup && currentGroup.name ? currentGroup.name : 'Messages'} signedIn={true} csrfToken={csrfToken} />
                <div className={styles.container}>
                    {/* group chat selection */}
                    <GroupsComponent csrfToken={csrfToken} groups={groups} currentGroup={currentGroup} />
                    {/* chat area */}
                    <ChatComponent csrfToken={csrfToken} groups={groups} currentGroup={currentGroup} />
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
        async function fetchMessages(accessToken) {
            const r = await fetch('http://localhost:3000/api/v1/user/groups/groups', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                }
            }).then(res => res.json())
            if (r.error) {
                if (r.message === 'Authentication Failed') { // if token is expired but exists
                    const newToken = await fetch('http://localhost:3000/api/v1/auth/account/token', { // refresh token
                        method: 'GET',
                        headers: {
                            Authorization: 'Bearer ' + cookies.refreshToken
                        }
                    }).then(res => res.json()).catch(err => console.log(err))

                    if (newToken.error && newToken.message === 'Invalid Token') { // if refresh token is invalid
                        return ctx.res.setHeader( // remove tokens from cookies (logout)
                            "Set-Cookie", [
                            `accessToken=deleted; Max-Age=0`,
                            `refreshToken=deleted; Max-Age=0`]
                        );
                    } else {
                        ctx.res.setHeader('Set-Cookie', [`accessToken=${newToken.accessToken}; Path=/; SameSite`]);
                        return await fetchMessages(newToken.accessToken)
                    }
                } else if (r.message === 'Invalid Token') { // if access token is invalid
                    ctx.res.setHeader( // remove tokens from cookies (logout)
                        "Set-Cookie", [
                        `accessToken=deleted; Max-Age=0`,
                        `refreshToken=deleted; Max-Age=0`]
                    );
                }
            }
            return r
        }

        const res = await fetchMessages(cookies.accessToken)
        if (res) {
            return {
                props: { // return props here
                    data: {
                        account_status: true,
                        data: res.groups ? res.groups : {}
                    },
                    csrfToken
                }
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