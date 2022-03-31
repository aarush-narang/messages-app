import Head from "next/head";
import { useState } from "react";
import styles from "../../styles/SignIn.module.css";
import { SignUpPasswordInput, Button, Input, ErrorMessage } from '../components/inputComponents'
import { csrf } from "../../lib/middleware";

const validateEmail = (email) => {
    const email_regex = /^(([^<>()\[\]\\.,;:\s@\"]+(\.[^<>()\[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    return email.match(email_regex)
}

export default function SignUp({ csrfToken }) {
    const [error, setError] = useState('');
    const changeDataState = (el, state) => {
        if (Array.isArray(el)) {
            el.forEach(element => {
                element.setAttribute('data-state', state);
                element.addEventListener('input', () => {
                    element.removeAttribute('data-state');
                    setError('')
                })
            })
            return
        }
        el.setAttribute('data-state', state);
        el.addEventListener('input', () => {
            document.querySelectorAll(`[data-state="error"]`).forEach(element => {
                element.removeAttribute('data-state');
            })
            setError('')
        })
    }
    return (
        <div>
            <Head>
                <title>Sign Up</title>
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
                        let err = false
                        Object.values(data).forEach((entry, i) => {
                            if (entry === '' && !err) {
                                changeDataState(e.target.elements[i], 'error');
                                const elName = e.target.elements[i].name
                                if (elName === 'confirm_password') return
                                setError(`${elName.charAt(0).toUpperCase() + elName.slice(1)} is required`);
                                err = true
                                return
                            }
                        })

                        if (data.password !== data.confirm_password && !err) {
                            setError('Passwords do not match');
                            return changeDataState([document.querySelector(`[name="password"]`), document.querySelector(`[name="confirm_password"]`)], 'error');
                        }
                        if (!validateEmail(data.email) && !err) {
                            setError('Email is not valid');
                            return changeDataState(document.querySelector(`[name="email"]`), 'error');
                        }
                        if ((data.username.length < 5 || data.username.length > 15) && !err) {
                            setError('Username must be between 5 and 15 characters');
                            return changeDataState(document.querySelector(`[name="username"]`), 'error');
                        }
                        if (err) return

                        // send data to server to create account and wait for response with user access and refresh token
                        const res = await fetch('/api/v1/auth/account/signup', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'CSRF-Token': csrfToken
                            },
                            body: JSON.stringify(data)
                        })
                        if (res.status === 400) {
                            const json = await res.json()
                            if(!json.message) {
                                changeDataState([...document.querySelectorAll(`[name]`)], 'error');
                                return setError('Something went wrong, try again later.')
                            } else if(json.message === 'DUPLICATE_USERNAME') {
                                setError('Username already exists');
                                return changeDataState(document.querySelector(`[name="username"]`), 'error');
                            } else if(json.message === 'DUPLICATE_EMAIL') {
                                setError('Email already exists');
                                return changeDataState(document.querySelector(`[name="email"]`), 'error');
                            }
                            return
                        }
                        else if (res.status === 200) {
                            const json = await res.json()
                            console.log(json)
                        }
                    }
                }>
                    <h1 className={styles.form_title}>Sign Up</h1>
                    <div className={styles.inputs_container}>
                        <Input type={'text'} placeholder={"Username"} name={"username"} minWidth={'170px'} width={'100%'} maxWidth={'500px'} height={'60px'} />
                        <Input placeholder={"Email"} name={"email"} minWidth={'240px'} width={'100%'} maxWidth={'500px'} height={'60px'} />
                        <SignUpPasswordInput name={"password"} minWidth={'240px'} width={'100%'} maxWidth={'500px'} height={'60px'} />
                        <ErrorMessage error={error} />
                    </div>
                    <div className={styles.form_helpers}>
                        {/* <p>Forgot your password? <a href="/account/forgot" className={styles.link}>Reset Password</a></p> */}
                        <p></p>
                        <p>Already have an account? <a href="/account/signin" className={styles.link}>Sign In</a></p>
                    </div>
                    <Button type={'submit'} name={"signin-submit"} innerText={'Sign Up'} className={styles.submit} />
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