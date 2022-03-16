import Head from "next/head";
import { useState, useEffect } from "react";
import styles from "../../styles/SignIn.module.css";
import { PasswordInput, Button, Input, ErrorMessage } from '../components/inputComponents'
import Cookies from 'js-cookie'
import { csrf } from "../../lib/middleware";

export default function SignIn({ csrfToken }) {
    const [error, setError] = useState('');
    const changeDataState = (el, state) => {
        el.setAttribute('data-state', state);
        el.addEventListener('input', () => {
            el.removeAttribute('data-state');
            setError('')
        })
    }
    return (
        <div>
            <Head>
                <title>Sign In</title>
            </Head>
            <div className={styles.form_container}>
                <form className={styles.form} onSubmit={
                    async (e) => {
                        e.preventDefault();
                        const formData = new FormData(e.target);
                        const data = {};
                        for (let name of formData.keys()) {
                            data[name] = formData.get(name);
                        }

                        if (!data.email) {
                            setError('Email is invalid');
                            return changeDataState(e.target[0], 'error');
                        } else if (!data.password) {
                            setError('Password is invalid');
                            return changeDataState(e.target[1], 'error');
                        }

                        if(error.length > 0) return; // prevents submit spam and redeces db calls
                        const res = await fetch('/api/v1/auth/account/signin', {
                            method: 'POST',
                            headers: {
                                'CSRF-Token': csrfToken,
                            },
                            body: JSON.stringify(data)
                        }).then(res => res.json()).catch(console.error)
                        if (res.status === 'INVALID_EMAIL') {
                            setError('Email is invalid');
                            return changeDataState(e.target[0], 'error');
                        } else if (res.status === 'NOT_FOUND') {
                            setError('Email or password is incorrect');
                            changeDataState(e.target[0], 'error');
                            changeDataState(e.target[1], 'error');
                            return
                        } else if (res.status === 'SUCCESS') {
                            Cookies.set('accessToken', res.accessToken, { secure: true, sameSite: 'strict' });
                            window.location.href = '/'
                            return
                        }
                    }
                }>
                    <h1 className={styles.form_title}>Sign In</h1>
                    <div className={styles.inputs_container}>
                        <Input placeholder={"Email"} name={"email"} minWidth={'170px'} width={'100%'} maxWidth={'500px'} height={'60px'} />
                        <PasswordInput name={"password"} minWidth={'170px'} width={'100%'} maxWidth={'500px'} height={'60px'} />
                        <ErrorMessage error={error} />
                    </div>
                    <div className={styles.form_helpers}>
                        <p>Don't have an account? <a href="/account/signup" className={styles.link}>Sign Up</a></p>
                        <p>Forgot your password? <a href="/account/forgot" className={styles.link}>Reset Password</a></p>
                    </div>
                    <Button type={'submit'} name={"signin-submit"} innerText={'Sign In'} className={styles.submit} />
                </form>
                {/* add other ways to authenticate (like google) */}
            </div>
        </div>
    );
}

export async function getServerSideProps(context) {
    const { req, res } = context
    await csrf(req, res)
    return {
        props: { csrfToken: req.csrfToken() },
    }
}