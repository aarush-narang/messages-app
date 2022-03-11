import styles from "../../styles/FormComponents.module.css";
import ErrorPage from 'next/error'
import { useState } from "react";

// for all input components, add dynamic ability to change width, height, font size, etc.
export function Input({ minWidth, width, maxWidth, minHeight, height, maxHeight, ...props }) {
    const inputStyles = {
        minWidth,
        width,
        maxWidth,
        minHeight,
        height,
        maxHeight,
    }
    return (
        <div>
            <input
                className={styles.input}
                type="text"
                placeholder="Email"
                autoComplete="false"
                autoCapitalize="false"
                autoCorrect="false"
                autoSave="false"
                style={inputStyles}
            />
        </div>
    )
}

export function PasswordInput({ minWidth, width, maxWidth, minHeight, height, maxHeight, ...props }) {
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
    const passStyles = {
        minWidth,
        width,
        maxWidth,
        minHeight,
        height,
        maxHeight,
    }
    return (
        <div>
            <input className={styles.input} style={passStyles} type={passView} placeholder="Password" />
            <a className={styles.pass_view} onClick={handlePassView}>{passText}</a>
        </div>
    )
}

export function Submit({ innerText, minWidth, width, maxWidth, minHeight, height, maxHeight, ...props }) {
    const submitStyles = {
        minWidth,
        width,
        maxWidth,
        minHeight,
        height,
        maxHeight,
    }
    return (
        <button className={styles.submit} style={submitStyles} type="submit">{innerText}</button>
    )
}

export default function () {
    return <ErrorPage statusCode={404} />
}