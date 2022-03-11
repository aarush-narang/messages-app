import Head from "next/head";
import styles from "../styles/Home.module.css";
import jsCookie from "js-cookie";
import * as cookie from 'cookie'

export default function Home({ data }) {
    
    return (
        <div className={styles.container}>
            <Head>
                <title>Messages</title>
            </Head>
            
        </div>
    );
}

export async function getServerSideProps(ctx) {
    const token = ctx.req.headers.cookie;
    const cookies = cookie.parse(token ? token : '');

    if(!cookies.token) { // if token is not found, meaning user is not logged in
        return {
            redirect: {
                destination: '/account/signin',
                permanent: false,
            }
        }
    } else {
        return {
            props: { // return props here
                message: 'Hello World'
            }
        }
    }
}