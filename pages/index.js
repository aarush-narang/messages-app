import Head from "next/head";
import styles from "../styles/Home.module.css";

export default function Home({ data }) {
    
    return (
        <div className={styles.container}>
            <Head>
                <title>Messages</title>
            </Head>
            
        </div>
    );
}