import Head from "next/head";
import { useState } from "react";
import styles from "../../styles/FormStyles/Forms.module.css";
import { SignUpPasswordInput, Button, Input, ErrorMessage } from '../components/formComponents'
import { FormPagesHeader } from "../components/header";
import { csrf } from "../../lib/middleware";
import * as cookie from 'cookie'
import crypto from 'crypto'

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
    const validateEmail = (email) => {
        const email_regex = /^(([^<>()\[\]\\.,;:\s@\"]+(\.[^<>()\[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
        return email.match(email_regex)
    }
    const handleInput = (input) => {
        const pwd = typeof input === 'string' ? input : input.target.value;
        const passChecksCont = document.querySelector('[name="checks"]');
        passChecksCont.style.opacity = pwd.length > 0 ? 1 : 0;
        passChecksCont.style.userSelect = pwd.length > 0 ? 'auto' : 'none';

        const lowerRegex = /^(?=.*[a-z]{3,})/
        const upperRegex = /^(?=.*[A-Z]{2,})/
        const numberRegex = /^(?=.*\d{2,})/
        const specialRegex = /^(?=.*[@$!%*?&]{1,})/

        passChecksCont.querySelector('[name="lower"]').setAttribute('data-state', !!pwd.match(lowerRegex));
        passChecksCont.querySelector('[name="upper"]').setAttribute('data-state', !!pwd.match(upperRegex));
        passChecksCont.querySelector('[name="number"]').setAttribute('data-state', !!pwd.match(numberRegex));
        passChecksCont.querySelector('[name="special"]').setAttribute('data-state', !!pwd.match(specialRegex));
        passChecksCont.querySelector('[name="minchar"]').setAttribute('data-state', pwd.length >= 8 ? true : false);

        return !!pwd.match(lowerRegex) && !!pwd.match(upperRegex) && !!pwd.match(numberRegex) && !!pwd.match(specialRegex) && pwd.length >= 8
    }
    const handleSubmit = handleInput
    const [loading, setLoading] = useState(false);

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow:'auto' }}>
            <Head>
                <title>Sign Up</title>
            </Head>
            <FormPagesHeader />
            <div className={styles.form_container} >
                <form className={styles.form} onSubmit={
                    async (e) => {
                        e.preventDefault();
                        setLoading(true);

                        const formData = new FormData(e.target);
                        const data = {};
                        for (let name of formData.keys()) {
                            data[name] = formData.get(name);
                        }
                        let err = false

                        setTimeout(() => {
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
                                changeDataState([document.querySelector(`[name="password"]`), document.querySelector(`[name="confirm_password"]`)], 'error');
                            }
                            else if (!handleSubmit(data.password) && !err) {
                                setError('Password must match requirements below');
                                changeDataState([document.querySelector(`[name="password"]`), document.querySelector(`[name="confirm_password"]`)], 'error');
                            }
                            else if (!validateEmail(data.email) && !err) {
                                setError('Email is not valid');
                                changeDataState(document.querySelector(`[name="email"]`), 'error');
                            }
                            else if ((data.username.length < 5 || data.username.length > 15) && !err) {
                                setError('Username must be between 5 and 15 characters');
                                changeDataState(document.querySelector(`[name="username"]`), 'error');
                            }
                            if (err) return setLoading(false)

                            // send data to server to create account and wait for response with user access and refresh token
                            setTimeout(async () => {
                                const ip = await fetch('https://api.ipify.org', {
                                    method: 'GET',
                                    headers: {
                                        'Content-Type': 'application/json'
                                    }
                                }).then(res => res.text())
                                data.ip = ip;
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
                                    if (!json.message) {
                                        changeDataState([...document.querySelectorAll(`[name]`)], 'error');
                                        setError('Something went wrong, try again later.')
                                    } else if (json.message === 'DUPLICATE_USERNAME') {
                                        setError('Username already exists');
                                        changeDataState(document.querySelector(`[name="username"]`), 'error');
                                    } else if (json.message === 'DUPLICATE_EMAIL') {
                                        setError('Email already exists');
                                        changeDataState(document.querySelector(`[name="email"]`), 'error');
                                    }
                                    return setLoading(false)
                                }
                                else if (res.status === 200) {
                                    window.location.href = '/'
                                }
                            }, 300);
                        }, 700);



                    }
                }>
                    {/* check password requirements on submit as well */}
                    <h1 className={styles.form_title}>Sign Up</h1>
                    <div className={styles.inputs_container}>
                        <Input type={'text'} placeholder={"Username"} name={"username"} minWidth={'240px'} width={'100%'} maxWidth={'500px'} height={'60px'} />
                        <Input placeholder={"Email"} name={"email"} minWidth={'240px'} width={'100%'} maxWidth={'500px'} height={'60px'} />
                        <SignUpPasswordInput name={"password"} minWidth={'240px'} width={'100%'} maxWidth={'500px'} height={'60px'} onInput={handleInput} />
                        <ErrorMessage error={error} />
                    </div>
                    <div className={styles.form_helpers}>
                        <p></p>
                        <p>Already have an account? <a href="/account/signin" className={styles.link}>Sign In</a></p>
                    </div>
                    <Button loading={loading} type={'submit'} name={"signin-submit"} innerText={'Sign Up'} className={styles.submit} />
                    <div name={'checks'} className={styles.password_checks} style={{ opacity: 0, userSelect: 'none' }}>
                        <div name={'lower'} className={styles.password_check}>At least three lowercase letters</div>
                        <div name={'upper'} className={styles.password_check}>At least two uppercase letters</div>
                        <div name={'number'} className={styles.password_check}>At least two numbers</div>
                        <div name={'special'} className={styles.password_check}>At least one special characters</div>
                        <div name={'minchar'} className={styles.password_check}>At least eight characters</div>
                    </div>
                </form>
                {/* add other ways to authenticate (like google) */}
            </div>
        </div>
    );
}


export async function getServerSideProps(context) {
    const { req, res } = context
    const cookies = cookie.parse(req.headers.cookie || '')
    if (cookies.accessToken || cookies.refreshToken) {
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