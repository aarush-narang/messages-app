import Head from "next/head";
import styles from "../styles/Home.module.css";
import * as cookie from 'cookie'
import { get } from '../lib/helpers/fetch-wrapper'
import Header from "./components/header";

export default function Home({ data }) {
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
    const tempStylesHref = {
        fontSize: "1rem",
        color: "red",
        textAlign: "center",
        textDecoration: "underline",
        marginTop: '20px',
    }
    if (!data.account_status) {
        return (
            <>
                <Header title={"Messages"} signedIn={false}/>
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
                    <Header />
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
    const token = ctx.req.headers.cookie;
    const cookies = cookie.parse(token ? token : '');

    if (!cookies.token) { // if token is not found, user is not logged in
        return {
            props: {
                data: {
                    account_status: false,
                    data: 'You are not logged in'
                }
            }
        }
    } else {
        const res = await get('http://localhost:3000/api/v1/auth/user/user', cookies).catch(err => {
            if (err) {
                ctx.res.setHeader('Set-Cookie', ['token=; Max-Age=0']);
                return {
                    redirect: {
                        destination: '/account/signin',
                    }
                }
            }
        })
        return {
            redirect: res.redirect,
            props: { // return props here
                data: {
                    account_status: true,
                    data: res.messages
                }
            }
        }
    }
}