import styles from "../../styles/FormComponents.module.css";
import ErrorPage from 'next/error'
import { useState } from "react";

// for all input components, add dynamic ability to change width, height, font size, etc.
export function Input() {
    return (
        <div>
            <input className={styles.input} type="text" placeholder="Email" autoComplete="false" autoCapitalize="false" autoCorrect="false" autoSave="false" />
        </div>
    )
}

export function PasswordInput() {
    const [passView, setPassView] = useState('password');
    const [passText, setPassText] = useState('View');
    function handlePassView(e) {
        e.preventDefault()
        if (passView === 'password') {
            setPassView('text');
            setPassText('Hide');
        } else {
            setPassView('password');
            setPassText('View');
        }
    }
    return (
        <div>
            <input className={styles.input} type={passView} placeholder="Password" />
            <a className={styles.pass_view} onClick={handlePassView}>{passText}</a>
        </div>
    )
}

export function Submit({ innerText }) {
    return (
        <button className={styles.submit} type="submit">{innerText}</button>
    )
}

export default function () {
    return <ErrorPage statusCode={404} />
}