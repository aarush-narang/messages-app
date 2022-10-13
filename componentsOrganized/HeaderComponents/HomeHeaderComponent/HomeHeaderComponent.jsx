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