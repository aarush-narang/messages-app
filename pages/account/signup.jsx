import Head from "next/head";
import { useState } from "react";
import styles from "../../styles/SignIn.module.css";
import { SignUpPasswordInput, Button, Input, ErrorMessage } from '../components/inputComponents'
import { csrf } from "../../lib/middleware";

export default function SignIn({ csrfToken }) {
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
                                setError(`${elName.charAt(0).toUpperCase() + elName.slice(1)} is required`);
                                err = true
                                return
                            }
                        })

                        if (data.password !== data.confirm_password) {
                            setError('Passwords do not match');
                            return changeDataState([document.querySelector(`[name="password"]`), document.querySelector(`[name="confirm_password"]`)], 'error');
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