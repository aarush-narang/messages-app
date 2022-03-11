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
                {/* warning if an error happens that makes border (dark) and background (light) of inputs red */}
                <form className={styles.form} onSubmit={
                    async (e) => {
                        e.preventDefault();
                        const res = await fetch('/api/v1/user/signin', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                email: e.target.email.value,
                                password: e.target.password.value
                            })
                        }).then(res => res.json()).catch(console.error)
                    }
                }>
                    <h1 className={styles.form_title}>Sign In</h1>
                    <div className={styles.inputs_container}>
                        <Input minWidth={'170px'} width={'100%'} maxWidth={'500px'} height={'60px'}/>
                        <PasswordInput minWidth={'170px'} width={'100%'} maxWidth={'500px'} height={'60px'}/>
                    </div>
                    <div className={styles.form_helpers}>
                        <p>Don't have an account? <a href="/account/signup" className={styles.link}>Sign Up</a></p>
                        <p>Forgot your password? <a href="/account/forgot" className={styles.link}>Reset Password</a></p>
                    </div>
                    <Submit innerText={'Sign In'} minWidth={'170px'} width={'60%'} maxWidth={'500px'} height={'60px'}/>
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