import styles from "../../styles/FormComponents.module.css";
import ErrorPage from 'next/error'
import { useState } from "react";

export function Input({ placeholder, onInput, name, minWidth, width, maxWidth, minHeight, height, maxHeight, type, ...props }) {
    const inputStyles = {
        minWidth,
        width,
        maxWidth,
        minHeight,
        height,
        maxHeight,
        ...props,
    }
    return (
        <div>
            <input
                className={styles.input}
                type={type || 'text'}
                placeholder={placeholder}
                autoComplete="false"
                autoCapitalize="false"
                autoCorrect="false"
                style={inputStyles}
                onInput={onInput}
                name={name}
            />
        </div>
    )
}

export function PasswordInput({ name, minWidth, width, maxWidth, minHeight, height, maxHeight, ...props }) {
    const [passView, setPassView] = useState('password');
    const [passText, setPassText] = useState('View');
    function handlePassView() {
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
        ...props,
    }
    return (
        <div>
            <input className={styles.input} style={passStyles} type={passView} placeholder="Password" name={name} />
            <a className={styles.pass_view} onClick={handlePassView}>{passText}</a>
        </div>
    )
}

export function SignUpPasswordInput({ name, onInput, onSubmit, minWidth, width, maxWidth, minHeight, height, maxHeight, ...props }) {
    const [passView, setPassView] = useState('password');
    const [confirmPassView, setConfirmPassView] = useState('password');
    const [passText, setPassText] = useState('View');
    const [confirmPassText, setConfirmPassText] = useState('View');
    function handlePassView() {
        if (passView === 'password') {
            setPassView('text');
            setPassText('Hide');
        } else {
            setPassView('password');
            setPassText('View');
        }
    }
    function handleConfirmPassView() {
        if (confirmPassView === 'password') {
            setConfirmPassView('text');
            setConfirmPassText('Hide');
        } else {
            setConfirmPassView('password');
            setConfirmPassText('View');
        }
    }
    const passStyles = {
        minWidth,
        width,
        maxWidth,
        minHeight,
        height,
        maxHeight,
        ...props,
    }
    return (
        <>
            <div>
                <input className={styles.input} onInput={onInput} onSubmit={onSubmit} style={passStyles} type={passView} placeholder="Password" name={name} />
                <a className={styles.pass_view} onClick={handlePassView}>{passText}</a>
            </div>
            <div>
                <input className={styles.input} style={passStyles} type={confirmPassView} placeholder="Confirm Password" name={"confirm_" + name} />
                <a className={styles.pass_view} onClick={handleConfirmPassView}>{confirmPassText}</a>
            </div>
        </>
    )
}


export function Spinner({ width, height, thickness, color, animationDuration='.85s', animationTimingFunction='cubic-bezier(0.14, 0.28, 0.29, 0.87)' }) {
    return (
        <div className={styles.spinner} style={{ width, height, borderWidth: thickness, borderColor: color, borderRightColor: 'transparent', animationDuration, animationTimingFunction }}></div>
    )
}
export function Button({ loading, loadingColor, type, name, innerText, className, minWidth, width, maxWidth, minHeight, height, maxHeight, ...props }) {
    const submitStyles = {
        minWidth,
        width,
        maxWidth,
        minHeight,
        height,
        maxHeight,
    }
    return (
        <button className={className} style={submitStyles} type={type ? type : "submit"} disabled={loading} name={name} onClick={props.onClick}>{
            loading ?
                <Spinner height={'1.75em'} width={'1.75em'} thickness={'3px'} color={loadingColor ? loadingColor : 'var(--color-correct-dark)'}/>
                :
                <a>{innerText}</a>
        }</button>
    )
}

export function ErrorMessage({ error, ...props }) {
    const errorStyles = {
        ...props,
    }

    return (
        <p className={styles.error} style={errorStyles}>{error}</p>
    )
}

export function Page404() {
    return <ErrorPage statusCode={404} />
}