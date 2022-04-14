import Head from "next/head";
import styles from "../styles/Home.module.css";
import * as cookie from 'cookie'
import Header from "./components/header";
import { csrf } from "../lib/middleware";

export default function Home({ data, csrfToken }) {
    if (!data.account_status) {
        return (
            <>
                <Header title={"Messages"} signedIn={false} />
                <div className={styles.container}>
                    <Head>
                        <title>Messages</title>
                    </Head>
                </div>
            </>

        );
    } else {
        const recipients = Object.keys(data.data)
        const messages = Object.values(data.data)
        return (
            <>
                <Header title={"Messages"} signedIn={true} csrfToken={csrfToken} />
                <div className={styles.container}>
                    <Head>
                        <title>Messages</title>
                    </Head>
                    {
                        data.data ?
                            recipients.map((r, i) => {
                                return (
                                    <div key={r} recipient={r}>
                                        <h3>{r}</h3>
                                        {
                                            messages[i].map(m => {
                                                return (
                                                    <div key={m.id} msg_id={m.id} ts={m.ts}>
                                                        <p>{m.message}</p>
                                                    </div>
                                                )
                                            })
                                        }
                                    </div>
                                )
                            }) :
                            <h1>Loading...</h1>
                    }
                </div>
            </>

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
            const r = await fetch('http://localhost:3000/api/v1/auth/user/messages', {
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
                        data: res.messages ? res.messages : {}
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