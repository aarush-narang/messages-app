import Head from "next/head";
import styles from "../../styles/SignIn.module.css";
import { PasswordInput, Submit, Input } from '../components/formComponents'

export default function SignIn({ data }) {
    return (
        <div>
            <Head>
                <title>Sign In</title>
            </Head>
            <div className={styles.form_container}>
                {/* title, input form with email, password, submit btn, link for signup page, 
                forgot password, warning if an error happens that makes border of inputs red */}
                <form className={styles.form}>
                    <h1 className={styles.form_title}>Sign In</h1>
                    <div className={styles.inputs_container}>
                        <Input />
                        <PasswordInput/>
                    </div>
                    <div className={styles.form_helpers}>
                        <p>Don't have an account? <a href="/account/signup" className={styles.link}>Sign Up</a></p>
                        <p>Forgot your password? <a href="/account/forgot" className={styles.link}>Reset Password</a></p>
                    </div>
                    <Submit innerText={'Sign In'}/>
                </form>
            </div>
        </div>
    );
}

export async function getServerSideProps() {
    return {
        props: {
            message: 'Hello World'
        }
    }
}