import styles from '../../styles/Header.module.css'
import { Button } from './inputComponents'
import Cookies from 'js-cookie'
import { fetchNewToken } from '../../lib/util'

export default function Header({ title = '', signedIn = false, csrfToken }) {
    async function logout() {
        const logoutRes = await fetch('/api/v1/auth/account/signout', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + Cookies.get('accessToken'),
                'CSRF-Token': csrfToken,
            }
        }).catch()

        if (logoutRes.status !== 200) {
            const newToken = await fetchNewToken(Cookies.get())
            if (!newToken) {
                Cookies.set('accessToken', 'deleted', { expires: 0 })
                Cookies.set('refreshToken', 'deleted', { expires: 0 })
                window.location.reload()
            }
            if (newToken.message === 'SUCCESS') {
                return logout()
            }
        } else if (logoutRes.status === 200) {
            Cookies.set('accessToken', 'deleted', { expires: 0 })
            Cookies.set('refreshToken', 'deleted', { expires: 0 })
            window.location.reload()
        }
    }
    return (
        <div className={styles.headerContainer}>
            <div></div>
            <div className={styles.headerTitle}>{title}</div>
            {
                signedIn ? // if signed in
                    <div className={styles.headerButtons}>
                        {/* get api route for logout */}
                        <Button onClick={async () => {
                            await logout()
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

