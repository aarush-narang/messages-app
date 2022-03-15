import styles from '../../styles/Header.module.css'
import { Button } from './inputComponents'

export default function Header({ title='', signedIn=false }) {
    return (
        <div className={styles.headerContainer}>
            <div></div>
            <div className={styles.headerTitle}>{title}</div>
            {
                signedIn ?
                    <div className={styles.headerButtons}>
                        {/* get api route for logout */}
                        <Button onClick={() => window.location = '/'} innerText={'Sign Out'}/>
                    </div>
                    :
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