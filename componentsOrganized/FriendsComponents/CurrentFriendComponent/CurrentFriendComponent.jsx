export function CurrentFriendComponent({ friend, groups, socket, setNotificationState }) {
    const mutualGroupIcons = groups.filter(group => {
        if (group.members.find(member => member.uid == friend.uid)) {
            return {
                icon: group.icon,
                name: group.name
            }
        }
    })

    const [confirmRemoveState, setConfirmRemoveState] = useState(false)

    return (
        <div className={friendStyles.friendContainer}>
            <section className={friendStyles.friendSection1}>
                <img src={friend.icon} alt={`friend.username's avatar`} className={friendStyles.friendIcon} />
            </section>
            <section className={friendStyles.friendSection2}>
                <div className={friendStyles.friendHeader}>
                    <div className={friendStyles.friendUsername} title={friend.username}>@{shortenName(friend.username, 18)}</div>
                    <div className={friendStyles.mutualGroups}>
                        {
                            mutualGroupIcons.map((group, i) => {
                                return (
                                    <img key={i} src={group.icon} title={`Mutual Group "${group.name}" with @${friend.username}`} alt={`Mutual Group "${group.name}" with @${friend.username}`} className={friendStyles.mutualGroupIcon} />
                                )
                            })
                        }
                    </div>
                </div>
                <div className={friendStyles.friendButtons}>
                    {
                        confirmRemoveState ?
                            <div>
                                Are you sure you want to remove <b>@{friend.username}</b> from your friends?
                                <div className={friendStyles.friendButtons}>
                                    <button className={`${friendStyles.friendButton} ${friendStyles.friendAccept}`} title={`Accept @${friend.username}'s friend request`}
                                        onClick={() => {
                                            socket.emit('friendRemove-server', { accessToken: jsCookie.get('accessToken'), friend, status: { action: 'remove', state: 'current' } }, (data) => {
                                                if (data.error) setNotificationState({ state: 'error', data: { message: data.error } })
                                                else if (data.success) setNotificationState({ state: 'success', data: { message: data.success } })
                                                else setNotificationState({ state: 'success', data: { message: data.success } })
                                            })
                                        }}
                                    >check_circle</button>
                                    <button className={`${friendStyles.friendButton} ${friendStyles.friendDecline}`} title={`Decline @${friend.username}'s friend request`}
                                        onClick={() => {
                                            setNotificationState({ state: 'warning', data: { message: `Cancelled` } })
                                            setConfirmRemoveState(false)
                                        }}
                                    >cancel</button>
                                </div>
                            </div>
                            :
                            <button className={`${friendStyles.friendButton} ${friendStyles.friendDecline}`} title={`Remove @${friend.username} from your friends`}
                                onClick={() => setConfirmRemoveState(true)}
                            >person_remove</button>
                    }
                </div>
            </section>
        </div>
    )
}