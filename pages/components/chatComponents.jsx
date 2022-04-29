import styles from "../../styles/Home.module.css";
import jsCookie from "js-cookie";
import { useState, useEffect } from "react";
import { useRefetchToken, useDebounce, shortenName, formatBytes, fetchUserInfo } from "./util";
import { Spinner } from "./inputComponents";
import moment from "moment";

export function GroupsComponent({ groups, csrfToken, currentGroup, user }) {
    if (currentGroup && !(groups.find(group => group.id == currentGroup.id))) { // if current group is not in groups, render spinner
        return (
            <div style={{ width: '100%', height: '90%', display: "flex", justifyContent: "center", alignItems: "center", position: 'absolute' }}>
                <Spinner color={'#2e8283'} height={'80px'} width={'80px'} thickness={'8px'} animationDuration={'1s'} animationTimingFunction={'cubic-bezier(0.62, 0.27, 0.08, 0.96)'} />
            </div>
        )
    }
    groups.sort((a, b) => a.order - b.order)

    // start the groups menu open or closed
    const [menuState, setMenuState] = useState(false);

    useEffect(() => {
        setMenuState(!(window.innerWidth > 900))
        window.addEventListener('resize', () => setMenuState(!(window.innerWidth > 900)))
    }, [])

    // draggable groups
    const [order, setOrder] = useState(groups.map(group => { // set the initial order of the groups
        return {
            id: group.id,
            order: group.order
        }
    }))

    useDebounce(async () => { // debounce the order of the groups & update the in db
        // TODO: pop up a modal
        await useRefetchToken(async () => {
            return await fetch('/api/v1/user/groups/updateGroupIndex', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'CSRF-Token': csrfToken,
                    'Authorization': `Bearer ${jsCookie.get('accessToken')}`
                },
                body: JSON.stringify(order)
            }).catch(err => console.log(err))
        })
    }, 1000, [order])

    useEffect(() => { // update the order of the groups (visually) when the order changes
        const draggables = document.querySelectorAll(`.${styles.group}`);
        const container = document.querySelector(`.${styles.groups}`);
        draggables.forEach(draggable => {
            draggable.addEventListener('dragstart', () => {
                draggable.classList.add(styles.dragging);
            });
            draggable.addEventListener('dragend', () => {
                draggable.classList.remove(styles.dragging);
            });
        })

        container.addEventListener('dragover', e => {
            e.preventDefault()
            const afterElement = getDragAfterElement(container, e.clientY)
            const draggable = document.querySelector(`.${styles.dragging}`)
            if (draggable.nextSibling === afterElement) return // prevent unnecessary DOM changes
            if (afterElement == null) {
                container.appendChild(draggable)
            } else {
                container.insertBefore(draggable, afterElement)
            }
            const newOrder = Array.from(container.children).map((child, order) => {
                const dataset = { ...child.dataset } // convert domstringmap to js object
                return {
                    id: dataset.groupid,
                    order
                }
            })
            if (order !== newOrder) setOrder(newOrder)

        })

        function getDragAfterElement(container, y) {
            const draggableElements = [...container.querySelectorAll(`.${styles.group}:not(.${styles.dragging})`)]

            return draggableElements.reduce((closest, child) => {
                const box = child.getBoundingClientRect()
                const offset = y - box.top - box.height / 2
                if (offset < 0 && offset > closest.offset) {
                    return { offset: offset, element: child }
                } else {
                    return closest
                }
            }, { offset: Number.NEGATIVE_INFINITY }).element
        }
    }, [])

    return (
        <>
            <div
                className={styles.left}
                style={{
                    minWidth: menuState ? '46px' : '350px',
                    width: menuState ? '46px' : '360px',
                    maxWidth: menuState ? '46px' : '700px',
                    resize: menuState ? 'none' : 'horizontal',
                    overflow: 'hidden',
                }}
            ><div className={styles.groupsContainer}>
                    <div className={styles.groups} style={{ opacity: menuState ? '0' : '1' }}>
                        {
                            groups.length > 0 ?
                                groups.map(group => {
                                    return (
                                        // group container
                                        <div key={group.id} data-groupid={group.id} data-selected={currentGroup && group.id == currentGroup.id} className={styles.group} draggable onClick={() => {
                                            if (currentGroup && group.id == currentGroup.id) {
                                                history.pushState({ currentGroup: null }, null, `/`)
                                                dispatchEvent(new PopStateEvent('popstate', { state: { currentGroup: null } }))
                                            } else {
                                                history.pushState({ currentGroup: group }, null, `/groups/${group.id}`)
                                                dispatchEvent(new PopStateEvent('popstate', { state: { currentGroup: group } }))
                                            }

                                        }}>
                                            <div className={styles.groupImage}>
                                                {
                                                    group.icon ? <img title={`${group.name}'s icon`} src={`/api/v1/data/images/${group.icon}`} loading={"lazy"} className={styles.groupImage} alt={`${group.name}'s icon`} /> :
                                                        <img title={`${group.name}'s icon`} src={`/api/v1/data/images/default`} loading={"lazy"} className={styles.groupImage} alt={`${group.name}'s icon`} />
                                                }
                                            </div>
                                            <div className={styles.groupInfo}>
                                                <h4 title={group.name} className={styles.groupTitle}>{shortenName(group.name)}</h4>
                                                <div title={`Members: ${group.members.length}`} className={styles.numOfMembers}>Members: {group.members.length}</div>
                                            </div>
                                            <div className={styles.lastMsg}></div>
                                        </div>
                                    )
                                }) :
                                <div className={styles.noGroupsContainer}>
                                    <div></div>
                                    <h2 style={{ textAlign: 'center' }}>No Direct Messages or Groups created/joined</h2>
                                    <div className={styles.joinGroup} onClick={() => {
                                        // TODO: pop up a modal to create a group or to create a dm
                                    }}>control_point</div>
                                    <div></div>
                                </div>
                        }
                    </div>
                    {
                        groups.length > 0 ?
                            <div style={{ display: `${menuState ? 'none' : 'flex'}`, justifyContent: 'center' }}>
                                <div className={styles.joinGroup} style={{ marginTop: '20px', fontSize: '50px' }} onClick={() => {
                                    // TODO: pop up a modal to create a group or to create a dm
                                }}>control_point</div>
                            </div> :
                            null

                    }
                </div>
                <a className={styles.arrow} style={{ transform: `${menuState ? 'rotate(180deg)' : 'rotate(0deg)'}` }} onClick={
                    (e) => {
                        setMenuState(!menuState)
                    }
                }>&#171;</a>
            </div>
        </>

    );
}

export function ChatComponent({ groups, csrfToken, currentGroup, user }) {
    if (currentGroup && !(groups.find(group => group.id == currentGroup.id))) { // spinner is already rendered in the groups component
        return (
            <></>
        )
    }
    if (!currentGroup) return <NoGroupSelected />
    const [img, setImg] = useState([])
    const [fontColor, setFontColor] = useState('')
    const [messages, setMessages] = useState([])
    useEffect(async () => {
        const messages = await useRefetchToken(async () => {
            return await fetch(`/api/v1/user/messages/${currentGroup.id}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${jsCookie.get('accessToken')}`
                }
            })
        }).then(res => res.json())

        setMessages(messages)
    }, [currentGroup])

    return (
        <div className={styles.main}>
            {/* messages display */}
            <div className={styles.messages}>
                {
                    messages.map(message => {
                        return (
                            <Message key={message.id} message={message} user={user} />
                        )
                    })
                }
            </div>
            {/* message part */}
            {
                img.map(i => {
                    return <img key={i} width={'30px'} height={'30px'} src={i} alt="img" />
                })
            }
            <div className={styles.messageInputContainer}>
                <form className={styles.messageInputForm} encType={"multipart/form-data"} onSubmit={
                    (e) => {
                        // TODO: send message &or files
                        e.preventDefault()
                        console.log(e)
                    }
                }>
                    <input id={'file-upload'} name={'message_file_upload[]'} type={"file"} style={{ display: 'none' }} multiple onInput={(e) => {
                        // TODO: validate file size and (look at todo below)
                        const files = [...e.target.files]
                        const totalSizeBytes = (files.reduce((acc, file) => {
                            return acc + file.size
                        }, 0))
                        if (totalSizeBytes / (1024 * 1024) > 5) {
                            // TODO: show error on a modal
                            alert('Max File Size is 5MB, your file is ' + formatBytes(totalSizeBytes))
                            e.target.value = ''
                        } else {
                            // TODO: show images above the input and allow to remove them (like discord)
                            console.log(files)
                            files.forEach(file => {
                                const reader = new FileReader()
                                reader.onloadend = (e) => {
                                    setImg(img.concat(e.target.result))
                                }
                                reader.readAsDataURL(file)
                            })
                        }
                    }} />
                    <label htmlFor={"file-upload"} className={styles.fileUpload}>
                        file_upload
                    </label>
                    {/* if group is dm, add an @ in front of the placeholder */}
                    <div className={styles.messageTextContainer} style={{ color: fontColor, fontWeight: fontColor ? 'bold' : 'normal' }} data-length="" data-max-length="5000">
                        <textarea className={styles.messageTextArea} placeholder={`Send a message to ${currentGroup.type === 'DM' ? '@' : ''}${currentGroup.name}`} onInput={(e) => {
                            const text = e.target.value
                            const parent = e.target.parentElement
                            if (text.length > 10000) {
                                e.target.value = text.slice(0, 10000)
                            } else {
                                if (Number(parent.dataset.maxLength) - text.length < 0) {
                                    parent.dataset.length = Number(parent.dataset.maxLength) - text.length
                                    setFontColor('var(--color-error-dark)')
                                } else if (Number(parent.dataset.maxLength) - text.length < 500) {
                                    parent.dataset.length = text.length
                                    setFontColor('')
                                } else {
                                    parent.dataset.length = ""
                                }
                            }

                            e.target.style.height = 'auto';
                            e.target.style.height = text.length == 0 ? '36px' : e.target.scrollHeight + 'px';
                        }}></textarea>
                    </div>
                    <button type={"submit"} className={styles.messageInputSubmit}>send</button>
                    {/* <input className={styles.messageInput} type="text" placeholder="Type a message..." /> */}
                </form>
            </div>
        </div>
    )
}

export function Message({ message, user }) {
    return (
        <div id={message.id} className={styles.message} data-timestamp={message.createdAt} data-sender={message.author.uid == user.uid}>
            <div className={styles.messageHeader}>
                <h4 className={styles.messageAuthor}>{message.author.username}</h4>
                <div className={styles.messageInfo}>
                    <div className={styles.messageInfoSec}>
                        <span className={styles.messageTS} title={moment(message.createdAt).format('llll')}>{moment(message.createdAt).fromNow()}</span>
                        <span className={styles.messageEdited} title={"This message was edited."}>{message.edited ? '(edited)' : ''}</span>
                    </div>
                    <span className={styles.messageOptions}>more_horiz</span>
                </div>
            </div>
            <div className={styles.messageContainer}>
                <img className={styles.messageIcon} src={`/api/v1/data/images/${message.author.icon}`} loading={"lazy"} alt={`${message.author.username}'s icon`} />
                <div className={styles.messageBody}>
                    {message.message}
                </div>
            </div>
        </div>
    )
}

export function NoGroupSelected() {
    return <></>
}