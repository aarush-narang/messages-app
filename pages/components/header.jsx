import styles from '../../styles/Header.module.css'
import { Button } from './formComponents'
import Cookies from 'js-cookie'
import { useState } from 'react'
import { useRefetchToken } from './util'
import { AccountDropdown } from './chatComponents'

export function HomeHeader({ title = '', signedIn = false, csrfToken }) {
    const [loading, setLoading] = useState(false)
    if (signedIn) {
        return (
            <div className={styles.headerContainer}>
                <div></div>
                <div className={styles.headerTitle}>{title}</div>
                <div className={styles.headerButtons}>
                    <AccountDropdown signOut={async () => {
                        setLoading(true)
                        setTimeout(async () => {
                            const res = await useRefetchToken(async () => {
                                return await fetch('http://localhost:3000/api/v1/auth/account/signout', {
                                    method: 'POST',
                                    headers: {
                                        'Authorization': 'Bearer ' + Cookies.get('accessToken'),
                                        'CSRF-Token': csrfToken,
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({
                                        refreshToken: Cookies.get('refreshToken')
                                    })
                                }).catch(err => console.log(err))
                            })
                            if (res.status === 200) {
                                Cookies.set('accessToken', 'deleted', { expires: 0 })
                                Cookies.set('refreshToken', 'deleted', { expires: 0 })
                                window.location.reload()
                            }
                        }, 500);
                    }} />
                </div>
            </div>
        )
    } else {
        return (
            <div className={styles.headerContainer}>
                <div></div>
                <div className={styles.headerTitle}>{title}</div>
                <div className={styles.headerButtons}>
                    <button onClick={() => window.location = "/account/signup"} className={styles.headerButton}>
                        <a>Sign Up</a>
                    </button>
                    <button onClick={() => window.location = "/account/signin"} className={styles.headerButton}>
                        <a>Sign In</a>
                    </button>
                </div>
            </div>
        )
    }

}

export function FormPagesHeader() {
    return (
        <div className={styles.formHeaderContainer}>
            <div className={styles.headerButtons}>
                <button onClick={() => window.location = "/"} className={styles.headerButton}>
                    <a>Return To Home</a>
                </button>
            </div>
        </div>
    )
}
