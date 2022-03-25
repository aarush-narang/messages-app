import Head from "next/head";
import styles from "../styles/Home.module.css";
import * as cookie from 'cookie'
import { get } from '../lib/helpers/fetch-wrapper'
import Header from "./components/header";
import { csrf } from "../lib/middleware";
import { fetchNewToken } from '../lib/util'

export default function Home({ data, csrfToken }) {
    const tempStylesMessage = {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: "1.5rem",
        fontWeight: "bold",
        color: "red",
        textAlign: "center",
    }

    if (!data.account_status) {
        return (
            <>
                <Header title={"Messages"} signedIn={false} />
                <div className={styles.container}>
                    <Head>
                        <title>Messages</title>
                    </Head>
                    <div style={tempStylesMessage}>

                    </div>
                </div>
            </>

        );
    } else {
        if (data.data) {
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
                            })
                        }
                    </div>
                </>

            );
        } else {
            return (
                <>
                    <h1>Loading...</h1>
                </>
            )
        }
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
            return await get('http://localhost:3000/api/v1/auth/user/user', { accessToken }).catch(async err => {
                if (err) {
                    if (err === 'Authentication Failed') { // if token is expired but exists
                        const newToken = await fetchNewToken(cookies)
                        // console.log("newToken " + newToken)
                        // ctx.res.setHeader( // set new token
                        //     "Set-Cookie", [
                        //     `accessToken=${newToken}; secure; SameSite=Strict`,
                        // ]);
                        // return await fetchMessages(newToken)
                        return { "messages": { "0e338472-e610-4325-b848-b3a79bf2abcc": [{ "message": "encrypted message here", "ts": { "$numberLong": "1647237661585" }, "id": { "$numberLong": "1000000000" } }, { "message": "message 2", "ts": { "$numberLong": "1647237861585" }, "id": { "$numberLong": "1000000001" } }], "a2445ffb-c966-4a36-9b3f-f28226277d9f": [{ "message": "asdasd", "ts": { "$numberLong": "1647237661581" }, "id": { "$numberLong": "1000000002" } }, { "message": "12asdu", "ts": { "$numberLong": "1647239661585" }, "id": { "$numberLong": "1000000003" } }] }, "uid": "083f9fe7-22a1-413f-9764-1965d0ddcca5" } }
                    else if (err === 'Invalid Token') { // if token is invalid
                            ctx.res.setHeader( // remove token from cookies (logout)
                                "Set-Cookie", [
                                `accessToken=deleted; Max-Age=0`,
                                `refreshToken=deleted; Max-Age=0`]
                            );
                        }
                    }
                })
        }
        const res = await fetchMessages(cookies.accessToken)
        if (res) {
            return {
                props: { // return props here
                    data: {
                        account_status: true,
                        data: res.messages
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