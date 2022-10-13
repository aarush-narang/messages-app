export function OutgoingFriendComponent({ friend, groups, socket, setNotificationState }) {
    const mutualGroupIcons = groups.filter(group => {
        if (group.members.find(member => member.uid == friend.uid)) {
            return {
                icon: group.icon,
                name: group.name
            }
        }
    })
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
                    <button className={`${friendStyles.friendButton} ${friendStyles.friendDecline}`} title={`Cancel your friend request to @${friend.username}`}
                        onClick={() => {
                            socket.emit('friendRequestManage-server', { accessToken: jsCookie.get('accessToken'), friend, status: { action: 'cancel', state: 'outgoing' } }, (data) => {
                                if (data.error) setNotificationState({ state: 'error', data: { message: data.error } })
                                else if (data.success) setNotificationState({ state: 'success', data: { message: data.success } })
                                else setNotificationState({ state: 'success', data: { message: data.success } })
                            })
                        }}
                    >cancel</button>
                </div>
            </section>
        </div>
    )
}