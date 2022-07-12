import Head from "next/head";
import homeStyles from "../../../styles/Home.module.css";
import * as cookie from 'cookie'
import { csrf } from "../../../lib/middleware";
import { HomeHeader } from "../../../components/header";
import { HomeComponent } from "../../../components/homeComponent";

export default function Home({ data, csrfToken }) {
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
    }
    else {
        return (
            <HomeComponent data={data} csrfToken={csrfToken} />
        )
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