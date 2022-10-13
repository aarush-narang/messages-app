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