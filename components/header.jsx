import headerStyles from '../styles/Header.module.css'
import homeStyles from "../styles/Home.module.css";
import Cookies from 'js-cookie'
import { useState } from 'react'
import { useRefetchToken, shortenName } from './util'
import { Spinner } from './formComponents';

export function HomeHeader({ title = '', signedIn = false, csrfToken, user }) {
    if (signedIn) {
        return (
            <div className={headerStyles.headerContainer}>
                <div></div>
                <div className={headerStyles.headerTitle}>{title}</div>
                <div className={headerStyles.headerButtons}>
                    <AccountDropdown signOut={async () => {
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
                    }} username={user.username} />
                </div>
            </div>
        )
    } else {
        return (
            <div className={headerStyles.headerContainer}>
                <div></div>
                <div className={headerStyles.headerTitle}>{title}</div>
                <div className={headerStyles.headerButtons}>
                    <button onClick={() => window.location = "/account/signup"} className={headerStyles.headerButton}>
                        <a>Sign Up</a>
                    </button>
                    <button onClick={() => window.location = "/account/signin"} className={headerStyles.headerButton}>
                        <a>Sign In</a>
                    </button>
                </div>
            </div>
        )
    }

}

export function AccountDropdown({ signOut, username }) {
    const [open, setOpen] = useState(false)
    const [clickOpen, setClickOpen] = useState(false)
    const [signOutLoading, setSignOutLoading] = useState(false)

    return (
        <div className={homeStyles.dropdownContainer} style={{ borderRadius: open ? '6px 6px 0 0' : '6px' }}
            onMouseOver={() => {
                if (!clickOpen) setOpen(true)
            }}
            onMouseLeave={() => {
                if (!clickOpen) setOpen(false)
            }}
        >
            <div className={homeStyles.dropdownButton}
                style={{ borderRadius: open ? '6px 6px 0 0' : '6px' }}
                onClick={() => setClickOpen(!clickOpen)}
            >
                <div className={homeStyles.dropdownButtonText}>@{shortenName(username, 25)}</div>
                <div className={homeStyles.dropdownButtonIcon}>account_circle</div>
            </div>
            <ul className={homeStyles.dropdown} style={{ top: open ? '44px' : '40px', opacity: open ? '1' : '0', pointerEvents: open ? 'all' : 'none' }}>
                <li className={homeStyles.dropdownItem} onClick={() => window.location = '/account/myaccount'}>
                    <div className={homeStyles.dropdownItemText}>Settings</div>
                    <div className={homeStyles.dropdownItemIcon}>settings</div>
                </li>
                <li className={`${homeStyles.dropdownItem} ${homeStyles.dropdownItemImportant}`} onClick={async () => {
                    setSignOutLoading(true)
                    setTimeout(async () => {
                        await signOut()
                    }, 1500);
                }}>
                    {
                        signOutLoading ?
                            <Spinner color={'#d25041'} height={23} width={23} thickness={4} animationDuration={'.95s'} />
                            :
                            <>
                                <div className={homeStyles.dropdownItemText}>Sign Out</div>
                                <div className={homeStyles.dropdownItemIcon}>logout</div>
                            </>
                    }
                </li>
            </ul>
        </div>
    )
}

export function FormPagesHeader() {
    return (
        <div className={headerStyles.formHeaderContainer}>
            <div className={headerStyles.headerButtons}>
                <button onClick={() => window.location = "/"} className={headerStyles.headerButton}>
                    <a>Return To Home</a>
                </button>
            </div>
        </div>
    )
}
