import Head from "next/head";
import { useState, useEffect } from "react";
import styles from "../../styles/Forms.module.css";
import { PasswordInput, Button, Input, ErrorMessage } from '../components/inputComponents'
import * as cookie from 'cookie'
import { csrf } from "../../lib/middleware";

const validateEmail = (email) => {
    const email_regex = /^(([^<>()\[\]\\.,;:\s@\"]+(\.[^<>()\[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    return email.match(email_regex)
}

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
            <div className={styles.form_container} style={{ minHeight: '80vh' }}>
                <form className={styles.form} onSubmit={
                    async (e) => {
                        e.preventDefault();
                        const formData = new FormData(e.target);
                        const data = {};
                        for (let name of formData.keys()) {
                            data[name] = formData.get(name);
                        }

                        if (!data.email || !validateEmail(data.email)) {
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
                                'Content-Type': 'application/json',
                                'CSRF-Token': csrfToken,
                            },
                            body: JSON.stringify(data)
                        })
                        if (res.status === 404 || res.status === 400) {
                            setError('Email or password is incorrect');
                            changeDataState(e.target[0], 'error');
                            changeDataState(e.target[1], 'error');
                            return
                        } else if (res.status === 200) {
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
    const cookies = cookie.parse(req.headers.cookie || '')
    if(cookies.accessToken || cookies.refreshToken) {
        return {
            redirect: {
                destination: '/'
            }
        }
    }
    await csrf(req, res)
    return {
        props: { csrfToken: req.csrfToken() },
    }
}