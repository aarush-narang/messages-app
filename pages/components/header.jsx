import styles from '../../styles/Header.module.css'
import { Button } from './formComponents'
import Cookies from 'js-cookie'
import { useState } from 'react'
import { useRefetchToken } from './util'

export function HomeHeader({ title = '', signedIn = false, csrfToken }) {
    async function logout() {
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
    }
    const [loading, setLoading] = useState(false)
    return (
        <div className={styles.headerContainer}>
            <div></div>
            <div className={styles.headerTitle}>{title}</div>
            {
                signedIn ? // if signed in
                    <div className={styles.headerButtons}>
                        {/* get api route for logout */}
                        <Button type={"button"} loadingColor={'#36727d'} loading={loading} className={styles.headerButton} onClick={async () => {
                            setLoading(true)
                            setTimeout(async () => {
                                await logout()
                            }, 500);
                        }} innerText={'Sign Out'} />
                    </div>
                    : // if not signed in
                    <div className={styles.headerButtons}>
                        <button onClick={() => window.location = "/account/signup"} className={styles.headerButton}>
                            <a>Sign Up</a>
                        </button>
                        <button onClick={() => window.location = "/account/signin"} className={styles.headerButton}>
                            <a>Sign In</a>
                        </button>
                    </div>
            }

        </div>
    )
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
