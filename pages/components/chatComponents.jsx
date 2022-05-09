import styles from "../../styles/Home.module.css";
import videoStyles from "../../styles/VideoOverlay.module.css";
import audioStyles from "../../styles/AudioOverlay.module.css";
import fileStyles from "../../styles/FileViews.module.css";
import jsCookie from "js-cookie";
import { useState, useEffect, useRef } from "react";
import { useDebounce, shortenName, formatBytes } from "./util";
import { Spinner } from "./inputComponents";
import moment from "moment";
import { marked } from "marked";
import e from "cors";

const SPINNER_COLOR = '#2e8283'
const MAX_FILE_SIZE = 8; // MB


export function GroupsComponent({ groups, csrfToken, currentGroup, user, socket }) {
    if (currentGroup && !(groups.find(group => group.id == currentGroup.id))) { // if current group is not in groups, render spinner
        return (
            <div style={{ width: '100%', height: '90%', display: "flex", justifyContent: "center", alignItems: "center", position: 'absolute' }}>
                <Spinner color={SPINNER_COLOR} height={'80px'} width={'80px'} thickness={'8px'} animationDuration={'1s'} animationTimingFunction={'cubic-bezier(0.62, 0.27, 0.08, 0.96)'} />
            </div>
        )
    }
    groups.sort((a, b) => a.order - b.order)

    // start the groups menu open or closed
    const [menuState, setMenuState] = useState(false); // true = closed, false = open

    useEffect(() => {
        setMenuState(window.innerWidth < 900)
        window.addEventListener('resize', () => { if (window.innerWidth < 900) setMenuState(true) })
    }, [])

    // draggable groups
    const [order, setOrder] = useState(groups.map(group => { // set the initial order of the groups
        return {
            id: group.id,
            order: group.order
        }
    }))

    // Sends updated group order to server
    useDebounce(async () => { // debounce the order of the groups & update the in db
        // TODO: pop up a modal
        socket.emit('updateGroupOrder', { accessToken: jsCookie.get('accessToken'), order })
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
    );
}

export function ChatComponent({ groups, csrfToken, currentGroup, user, msgsState, socket }) {
    if (currentGroup && !(groups.find(group => group.id == currentGroup.id))) { // spinner is already rendered in the groups component
        return (
            <></>
        )
    }
    if (!currentGroup) return <NoGroupSelected />
    const [img, setImg] = useState([]) // images to be uploaded
    const [fontColor, setFontColor] = useState('') // used to change the font color of the message char limit text
    const [scrollButton, setScrollButton] = useState(false) // if the chat is scrolled high enough, show the scroll to bottom button
    const [msgsLoading, setMsgsLoading] = useState([]) // groups that have messages loading
    const [maxMessages, setMaxMessages] = useState([]) // groups that have reached their max messages
    const topEl = useRef(null) // the message at the top of the chat

    const [messages, setMessages] = msgsState // messages of each group that have been loaded. Stored in parent component to avoid losing data when navigating between groups


    function scrollMessagesDiv(pos = null) {
        const msgsContainer = document.querySelector(`.${styles.messages}`)
        msgsContainer.scrollTo(null, pos ? pos : msgsContainer.scrollHeight)
    }

    useEffect(async () => {
        if (!messages.find(grp => grp.id === currentGroup.id) && !msgsLoading.includes(currentGroup.id)) {
            // push group id to loading so that it doesn't load again
            setMsgsLoading([currentGroup.id].concat(msgsLoading))

            socket.emit('currentGroupChange', { groupId: currentGroup.id, accessToken: jsCookie.get('accessToken') }, (msgs) => {
                if (!msgs) return;
                // push the messages to the messages array w/ group id
                setMessages([{ messages: [...msgs], id: currentGroup.id }].concat(messages))
                // remove group from loading array
                setMsgsLoading(msgsLoading.filter(grp => grp !== currentGroup.id))
            })
        }
        // when messages load, scroll div all the way to the bottom
        scrollMessagesDiv()
    }, [currentGroup])
    useEffect(scrollMessagesDiv, [msgsLoading && !messages.find(grp => grp.id === currentGroup.id)]) // scroll to bottom when messages load for the first time only
    useEffect(() => {
        const msgsContainer = document.querySelector(`.${styles.messages}`)
        const curGrpMessages = messages.find(grp => grp.id === currentGroup.id)

        if (msgsLoading.includes(currentGroup.id) && curGrpMessages) {
            socket.emit('loadMessages', { accessToken: jsCookie.get('accessToken'), groupId: currentGroup.id, curMsgsCt: curGrpMessages.messages.length }, (newMsgs) => {
                // new messages are added to the top
                if (newMsgs && newMsgs.length > 0) {
                    const newAppendedMessages = newMsgs.concat(curGrpMessages.messages)
                    const newMsgsObj = [{ messages: newAppendedMessages, id: currentGroup.id }].concat(messages.filter(grp => grp.id !== currentGroup.id))

                    // set top element in messages viewport 
                    const msgs = msgsContainer.querySelectorAll(`.${styles.message}`)
                    if (msgs) {
                        const topMsg = [...msgs].find(msg => msg.getBoundingClientRect().top > 0)
                        topMsg.ref = topEl
                        topEl.current = topMsg
                    }

                    // set the new messages + the old messages
                    setMessages(newMsgsObj)

                    if (topEl.current) topEl.current.scrollIntoView() // FIX: only scroll into view if they have NOT clicked the scroll down button
                }
                else setMaxMessages([currentGroup.id].concat(maxMessages))
                setMsgsLoading(msgsLoading.filter(grp => grp !== currentGroup.id))
            })
        }
    }, [msgsLoading.includes(currentGroup.id)])

    return (
        <div className={styles.main}>
            {/* messages display */}
            <div className={styles.messages}
                // scrolling for loading more messages
                onScroll={(e) => {
                    const scrollTop = e.target.scrollTop
                    const scrollHeight = e.target.scrollHeight
                    const clientHeight = e.target.clientHeight

                    // show button to scroll back to bottom
                    if (scrollTop < scrollHeight - (clientHeight * 10)) {
                        setScrollButton(true)
                    } else {
                        setScrollButton(false)
                    }

                    // if max messages, dont try to load more
                    if (maxMessages.includes(currentGroup.id)) return

                    // load more messages
                    if (scrollTop <= (scrollHeight - clientHeight) * 0.3 && !maxMessages.includes(currentGroup.id) && !msgsLoading.includes(currentGroup.id)) {
                        setMsgsLoading([currentGroup.id].concat(msgsLoading))
                    }
                }}
            >
                {
                    msgsLoading.includes(currentGroup.id) && messages.find(grp => grp.id === currentGroup.id) ?
                        <div className={styles.msgsLoading}>
                            <Spinner width={'40px'} height={'40px'} color={SPINNER_COLOR} thickness={'5px'} />
                        </div> : null
                }
                {
                    messages.find(grp => grp.id === currentGroup.id) ?
                        messages.find(grp => grp.id === currentGroup.id).messages.map(message => {
                            return (
                                <Message key={message.id} message={message} user={user} />
                            )
                        }) :
                        <div className={styles.msgsLoading}>
                            <Spinner width={'40px'} height={'40px'} color={SPINNER_COLOR} thickness={'5px'} />
                        </div>
                }
            </div>
            {/* scroll down button */}
            <div className={styles.scrollContainer} style={{ opacity: scrollButton ? '' : '0', pointerEvents: scrollButton ? '' : 'none' }} onClick={
                (e) => {
                    const msgsContainer = document.querySelector(`.${styles.messages}`)
                    msgsContainer.scrollTo({ top: msgsContainer.scrollHeight, behavior: 'smooth' })
                }
            }>
                <span className={styles.overflowButton} title={"Scroll To Bottom"}>keyboard_double_arrow_down</span>
            </div>
            {/* message part */}
            {/* images */}
            {
                img.map(i => {
                    const { base64, name } = i
                    console.log(Buffer.from(base64, 'base64'))
                    console.log(name)
                    return <img key={Math.random()} width={'30px'} height={'30px'} src={base64} alt="img" />
                })
            }
            {/* message input */}
            <div className={styles.messageInputContainer}>
                <form className={styles.messageInputForm} encType={"multipart/form-data"} onSubmit={
                    (e) => {
                        e.preventDefault()

                        // get formdata
                        const formData = new FormData(e.target)
                        // convert to json
                        const formDataObj = Object.fromEntries(formData.entries())
                        // remove empty values
                        if (formDataObj.files && formDataObj.files.size === 0) formDataObj.files = []
                        // confirm message length
                        if (formDataObj.content.length > 5000) {
                            return alert('Message too long!')
                        } else if (formDataObj.content.length === 0 && formDataObj.files.length === 0) {
                            return alert('Message cannot be empty!')
                        }
                        // set files
                        const files = [...e.target.children.namedItem('files').files]
                        const fileObjs = []
                        for (let i = 0; i < files.length; i++) {
                            fileObjs.push({
                                name: files[i].name,
                                data: files[i]
                            })
                        }
                        console.log(fileObjs)
                        formDataObj.files = fileObjs

                        // send message
                        socket.emit('messageCreate', { accessToken: jsCookie.get('accessToken'), groupId: currentGroup.id, message: formDataObj }, (msg) => {

                        })
                        // clear form and images
                        setImg([])
                        e.target.reset()
                    }
                }>
                    <input name={'files'} id={'file-upload'} type={"file"} style={{ display: 'none' }} multiple onDrop={(e) => {
                        e.preventDefault()
                        console.log(e)
                    }} onInput={(e) => {
                        // TODO: validate file size and (look at todo below)
                        const files = [...e.target.files]
                        const totalSizeBytes = (files.reduce((acc, file) => {
                            return acc + file.size
                        }, 0))
                        if (totalSizeBytes / (1024 * 1024) > MAX_FILE_SIZE) {
                            // TODO: show error on a modal
                            alert('Max File Size is 5MB, your file is ' + formatBytes(totalSizeBytes))
                            e.target.value = ''
                            setImg([])
                        } else if (img.length + files.length > 5 || files.length > 5) {
                            alert('Max number of files that can be uploaded is 5, you have ' + (img.length + files.length > 5 ? img.length : files.length) + ' files')
                            e.target.value = ''
                            setImg([])
                        } else {
                            // TODO: show images above the input and allow to remove them (like discord)
                            function readFileAsText(file) {
                                return new Promise(function (resolve, reject) {
                                    let fr = new FileReader();
                                    fr.onloadend = function () {
                                        resolve(fr.result);
                                    };
                                    fr.onerror = function () {
                                        reject(fr);
                                    };
                                    fr.readAsDataURL(file);
                                });
                            }
                            const readers = []
                            for (let i = 0; i < files.length; i++) {
                                readers.push(readFileAsText(files[i]))
                            }
                            Promise.allSettled(readers).then(async (results) => {
                                for (let i = 0; i < results.length; i++) {
                                    if (results[i].status === 'fulfilled') {
                                        setImg(img.concat([{ base64: results[i].value, name: files[i].name }]))
                                    }
                                }
                            })
                        }
                    }} />
                    <label htmlFor={"file-upload"} className={styles.fileUpload}>
                        file_upload
                    </label>
                    <div className={styles.messageTextContainer} style={{ color: fontColor, fontWeight: fontColor ? 'bold' : 'normal' }} data-length="">
                        <textarea name={"content"} className={styles.messageTextArea} placeholder={`Send a message to ${currentGroup.members.length == 2 ? '@' : ''}${currentGroup.name}`}
                            onKeyDown={(e) => {
                                if (e.key == 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    e.target.form.querySelector('[type="submit"]').click() // submit form
                                    return
                                }
                            }}
                            onInput={(e) => { // validating characters length
                                const text = e.target.value
                                const parent = e.target.parentElement
                                const MAX_LENGTH = 5000

                                if (text.length > 10000) {
                                    e.target.value = text.slice(0, 10000)
                                } else {
                                    if (MAX_LENGTH - text.length < 0) {
                                        parent.dataset.length = MAX_LENGTH - text.length
                                        setFontColor('var(--color-error-dark)')
                                    } else if (MAX_LENGTH - text.length < 500) {
                                        parent.dataset.length = text.length
                                        setFontColor('')
                                    } else {
                                        parent.dataset.length = ""
                                    }
                                }

                                e.target.style.height = 'auto';
                                e.target.style.height = text.length == 0 ? '36px' : e.target.scrollHeight + 'px';
                            }}
                        ></textarea>
                    </div>
                    <button type={"submit"} className={styles.messageInputSubmit}>send</button>
                </form>
            </div>
        </div>
    )
}

export function Message({ message, user }) {
    const [textFileState, setTextFileState] = useState(false)
    function downloadBase64File(data, fileName) {
        const linkSource = data;
        const downloadLink = document.createElement('a');
        document.body.appendChild(downloadLink);

        downloadLink.href = linkSource;
        downloadLink.target = '_self';
        downloadLink.download = fileName;
        downloadLink.click();
        document.body.removeChild(downloadLink);
    }
    return (
        <div id={message.id} className={styles.message} data-timestamp={message.createdAt} data-sender={message.author.uid == user.uid}>
            <img className={styles.messageIcon} src={`/api/v1/data/images/${message.author.icon}`} loading={"lazy"} alt={`${message.author.username}'s icon`} />

            <div className={styles.messageContainer}>
                <div className={styles.messageHeader}>
                    <h4 className={styles.messageAuthor}>{message.author.username}</h4>
                    <div className={styles.messageInfo}>
                        <div className={styles.messageInfoSect}>
                            <span className={styles.messageTS} title={moment(message.createdAt).format('llll')}>{moment(message.createdAt).fromNow()}</span>
                            <span className={styles.messageEdited} title={"This message was edited."}>{message.edited ? '(edited)' : ''}</span>
                        </div>
                        <span className={styles.messageOptions}>more_horiz</span>
                    </div>
                </div>
                <div className={styles.messageBody} style={{ height: '100%' }}>
                    <div className={styles.messageContent}>{message.message.content}</div>
                    <div className={styles.messageFiles}>{message.message.files.map((fileInfo) => {
                        const data = Buffer.isBuffer(fileInfo.data) ? data.toString('base64') : fileInfo.data
                        const name = fileInfo.name

                        const mimeType = data.split(':')[1].split(';')[0]
                        const generalType = mimeType.split('/')[0]
                        const specificType = mimeType.split('/')[1]
                        const content = data.split(',')[1]

                        switch (true) {
                            case generalType === 'image' && specificType === 'apng':
                            case generalType === 'image' && specificType === 'avif':
                            case generalType === 'image' && specificType === 'jpeg':
                            case generalType === 'image' && specificType === 'png':
                            case generalType === 'image' && specificType === 'svg':
                            case generalType === 'image' && specificType === 'webp':
                                return <img key={data} className={fileStyles.messageFile} src={data} alt={name} />
                            case generalType === 'audio' && specificType === 'ogg':
                            case generalType === 'audio' && specificType === 'mp3':
                            case generalType === 'audio' && specificType === 'wav':
                            case generalType === 'audio' && specificType === 'mpeg':
                                return <AudioFileView key={data} data={data} mimeType={mimeType} name={name} />
                            case generalType === 'video' && specificType === 'ogg':
                            case generalType === 'video' && specificType === 'mp4':
                            case generalType === 'video' && specificType === 'webm':
                                return <VideoFileView key={data} data={data} name={name} mimeType={mimeType} />
                            case generalType === 'text' && specificType === 'plain':
                                const fileSize = data ? formatBytes((data.split(',')[1].length * (3 / 4)) - (data.endsWith('==') ? 2 : 1)) : 0 // base64 size formula
                                return (
                                    <pre key={data} wrap={"true"} className={fileStyles.messageFile}>
                                        <div className={fileStyles.preHeader}>
                                            <div className={fileStyles.preTitle}>
                                                <b style={{ fontSize: '18px' }}>{name.split('.').length > 1 ? name : name + '.txt'}</b>
                                                <div className={fileStyles.preButtons}>
                                                    <div className={fileStyles.preButton} onClick={() => {
                                                        setTextFileState(!textFileState)
                                                    }}>{textFileState ? 'unfold_less' : 'unfold_more'}</div>
                                                    <div className={fileStyles.preButton} onClick={() => downloadBase64File(data, name)}>file_download</div>
                                                    <div className={fileStyles.preFileSize}>{fileSize}</div>
                                                </div>
                                            </div>
                                            <span className={fileStyles.divider}></span>
                                        </div>
                                        {
                                            textFileState ?
                                                Buffer.from(content, 'base64').toString('utf-8') :
                                                null
                                        }
                                    </pre>
                                )
                            case generalType === 'text' && specificType === 'markdown': // TODO: markdown viewer
                                return (
                                    <div>
                                        {marked.parse(Buffer.from(content, 'base64').toString('utf-8'))}
                                    </div>
                                )
                            default:
                                return <DefaultFileView key={data} mimeType={mimeType} data={data} name={name} />
                        }
                    })}</div>
                </div>
            </div>
        </div>
    )
}

export function VideoFileView({ data, name, mimeType }) {
    const fileSize = data ? formatBytes((data.split(',')[1].length * (3 / 4)) - (data.endsWith('==') ? 2 : 1)) : 0 // base64 size formula
    const PLAYBACK_SPEEDS = ['0.25', '0.5', '0.75', '1', '1.25', '1.5', '1.75', '2']
    const [playing, _setPlaying] = useState(false) // true = playing, false = paused
    const [fullscreen, _setFullscreen] = useState(false) // true = fullscreen, false = not fullscreen
    const [volume, _setVolume] = useState(1) // 0 - 1
    const [muted, _setMuted] = useState(false)
    const [playbackSpeed, _setPlaybackSpeed] = useState('1')
    const [currentTime, _setCurrentTime] = useState(0) // in seconds
    const [duration, _setDuration] = useState(0) // in seconds
    const [pbSpeedMenuState, setPbSpeedMenuState] = useState(false)

    const mutedRef = useRef(muted)
    const volumeRef = useRef(volume)
    const playingRef = useRef(playing)
    const fullscreenRef = useRef(fullscreen)
    const playbackSpeedRef = useRef(playbackSpeed)
    const currentTimeRef = useRef(currentTime)
    const durationRef = useRef(duration)

    function downloadBase64File(data, fileName) {
        const downloadLink = document.createElement('a');
        document.body.appendChild(downloadLink);

        downloadLink.href = data;
        downloadLink.target = '_self';
        downloadLink.download = fileName;
        downloadLink.click();
        document.body.removeChild(downloadLink);
    }
    const setFullscreen = (value) => {
        fullscreenRef.current = value
        _setFullscreen(value)
    }
    const setMuted = (value) => {
        mutedRef.current = value
        _setMuted(value)
    }
    const setVolume = (value) => {
        volumeRef.current = value
        _setVolume(value)
    }
    const setPlaying = (value) => {
        playingRef.current = value
        _setPlaying(value)
    }
    const setPlaybackSpeed = (value) => {
        playbackSpeedRef.current = value
        _setPlaybackSpeed(value)
    }
    const setCurrentTime = (value) => {
        currentTimeRef.current = value
        _setCurrentTime(value)
    }
    const setDuration = (value) => {
        durationRef.current = value
        _setDuration(value)
    }
    const leadingZeroFormatter = new Intl.NumberFormat(undefined, {
        minimumIntegerDigits: 2,
    })
    const formatDuration = (duration) => {
        const seconds = Math.floor(duration % 60)
        const minutes = Math.floor(duration / 60) % 60
        const hours = Math.floor(duration / 3600)

        return (hours > 0 ? `${hours}:` : '') + (minutes > 0 ? `${leadingZeroFormatter.format(minutes)}:` : '0:') + `${leadingZeroFormatter.format(seconds)}`
    }

    const videoRef = useRef(null)
    const videoContainerRef = useRef(null)
    const pbSpeedElementRef = useRef(null)

    useEffect(() => {
        playing ? videoRef.current.play() : videoRef.current.pause()
    }, [playing])
    useEffect(() => {
        if (document.fullscreenElement == null && fullscreen) {
            videoContainerRef.current.requestFullscreen()
        } else if (document.fullscreenElement) {
            document.exitFullscreen()
        }
    }, [fullscreen])
    useEffect(() => {
        videoRef.current.volume = volume
    }, [volume])
    useEffect(() => {
        videoRef.current.muted = muted
    }, [muted])
    useEffect(() => {
        videoRef.current.currentTime = currentTime
    }, [currentTime])
    useEffect(() => {
        videoRef.current.playbackRate = parseFloat(playbackSpeed)
    }, [playbackSpeed])
    useEffect(() => {
        document.addEventListener('keydown', (e) => {
            const tagName = document.activeElement.tagName.toLowerCase()
            if (tagName === 'input' || tagName === 'textarea') return
            if (!document.fullscreenElement) return
            switch (e.key.toLowerCase()) {
                case ' ':
                    if (tagName === 'button') return
                case 'k':
                    setPlaying(!playingRef.current)
                    break
                case 'f':
                    setFullscreen(!fullscreenRef.current)
                    if (document.fullscreenElement) document.exitFullscreen()
                    break
                case 'm':
                    setMuted(!videoRef.current.muted)
                    break
                case 'arrowleft':
                    setCurrentTime(currentTimeRef.current - 5)
                    break
                case 'j':
                    setCurrentTime(currentTimeRef.current - 10)
                    break
                case 'arrowright':
                    setCurrentTime(currentTimeRef.current + 5)
                    break
                case 'l':
                    setCurrentTime(currentTimeRef.current + 10)
                    break
                case 'arrowup':
                    setVolume(volumeRef.current + 0.1)
                    break
                case 'arrowdown':
                    setVolume(volumeRef.current - 0.1)
                    break
            }
        })
        document.addEventListener('fullscreenchange', () => {
            setFullscreen(document.fullscreenElement != null)
        })
        document.addEventListener('click', (e) => {
            if (!e.composedPath().includes(pbSpeedElementRef.current)) {
                setPbSpeedMenuState(false)
            }
        })
        videoRef.current.addEventListener('loadeddata', () => {
            setDuration(videoRef.current.duration)
        })
        videoRef.current.addEventListener('timeupdate', () => {
            setCurrentTime(videoRef.current.currentTime)
        })
    }, [])
    return (
        <div className={videoStyles.videoContainer} data-playing={playing} data-fullscreen={fullscreen} ref={videoContainerRef}>
            <div className={videoStyles.videoInformationContainer}>
                <div className={videoStyles.videoInformation}>
                    <div className={videoStyles.videoHeader}>
                        <div className={videoStyles.videoFileName}>{name}</div>
                        <div className={videoStyles.videoFileSize}>{fileSize}</div>
                    </div>
                    <div className={videoStyles.videoDownload} onClick={() => downloadBase64File(data, name)}>file_download</div>
                </div>
            </div>
            <div className={videoStyles.videoControlsContainer}>
                <div className={videoStyles.timelineContainer}>
                    <input className={videoStyles.timeline} step={0.001} type="range" min="0" max={durationRef.current} value={currentTimeRef.current} onChange={(e) => setCurrentTime(e.target.value)} />
                </div>
                <div className={videoStyles.controls}>
                    <button className={videoStyles.playPauseBtn} onClick={() => setPlaying(!playing)}>
                        {
                            playing ?
                                <svg viewBox="0 0 24 24">
                                    <path fill="currentColor" d="M14,19H18V5H14M6,19H10V5H6V19Z" />
                                </svg> :
                                <svg viewBox="0 0 24 24">
                                    <path fill="currentColor" d="M8,5.14V19.14L19,12.14L8,5.14Z" />
                                </svg>
                        }
                    </button>
                    <div className={videoStyles.volumeContainer}>
                        <button className={videoStyles.muteBtn} onClick={() => setMuted(!muted)}>
                            {
                                muted || volume == 0 ?
                                    <svg viewBox="0 0 24 24">
                                        <path fill="currentColor" d="M12,4L9.91,6.09L12,8.18M4.27,3L3,4.27L7.73,9H3V15H7L12,20V13.27L16.25,17.53C15.58,18.04 14.83,18.46 14,18.7V20.77C15.38,20.45 16.63,19.82 17.68,18.96L19.73,21L21,19.73L12,10.73M19,12C19,12.94 18.8,13.82 18.46,14.64L19.97,16.15C20.62,14.91 21,13.5 21,12C21,7.72 18,4.14 14,3.23V5.29C16.89,6.15 19,8.83 19,12M16.5,12C16.5,10.23 15.5,8.71 14,7.97V10.18L16.45,12.63C16.5,12.43 16.5,12.21 16.5,12Z" />
                                    </svg> :
                                    (
                                        volume > .5 ?
                                            <svg viewBox="0 0 24 24">
                                                <path fill="currentColor" d="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.84 14,18.7V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z" />
                                            </svg> :
                                            <svg viewBox="0 0 24 24">
                                                <path fill="currentColor" d="M5,9V15H9L14,20V4L9,9M18.5,12C18.5,10.23 17.5,8.71 16,7.97V16C17.5,15.29 18.5,13.76 18.5,12Z" />
                                            </svg>
                                    )
                            }
                        </button>
                        <input className={videoStyles.volumeSlider} type="range" min="0" max="1" step="any" defaultValue={1} onInput={(e) => {
                            setVolume(e.target.value)
                            if (muted) setMuted(false)
                        }} />
                    </div>
                    <div className={videoStyles.durationContainer}>
                        <div className={videoStyles.currentTime}>{formatDuration(currentTime)}</div>
                        /
                        <div className={videoStyles.totalTime}>{formatDuration(duration)}</div>
                    </div>
                    <div ref={pbSpeedElementRef} className={videoStyles.playBackSpeedContainer} onClick={
                        () => setPbSpeedMenuState(!pbSpeedMenuState)
                    }>
                        {/* show menu of all playback speeds and highlight the one that is currently selected */}
                        <ul className={videoStyles.playBackSpeeds} data-open={pbSpeedMenuState}>
                            {
                                PLAYBACK_SPEEDS.map(speed => {
                                    return <li key={speed} data-current={speed == playbackSpeed} className={videoStyles.playBackSpeed} onClick={() => setPlaybackSpeed(speed)}>{speed}x</li>
                                })
                            }
                        </ul>
                        <div className={videoStyles.currentPlayBackSpeed}>{playbackSpeed}x</div>
                    </div>
                    <button className={videoStyles.fullScreenBtn} onClick={(e) => setFullscreen(!fullscreen)}>
                        {
                            fullscreen ?
                                <svg viewBox="0 0 24 24">
                                    <path fill="currentColor" d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                                </svg> :
                                <svg viewBox="0 0 24 24">
                                    <path fill="currentColor" d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                                </svg>
                        }
                    </button>
                </div>
            </div>
            <video key={data} className={videoStyles.video} ref={videoRef}
                onClick={() => setPlaying(!playing)}
            >
                <source src={data} type={mimeType} />
            </video>
        </div>
    )
}

export function AudioFileView({ data, name, mimeType }) {
    const fileSize = data ? formatBytes((data.split(',')[1].length * (3 / 4)) - (data.endsWith('==') ? 2 : 1)) : 0 // base64 size formula
    const PLAYBACK_SPEEDS = ['0.25', '0.5', '0.75', '1', '1.25', '1.5', '1.75', '2']
    const [playing, _setPlaying] = useState(false) // true = playing, false = paused
    const [volume, _setVolume] = useState(1) // 0 - 1
    const [muted, _setMuted] = useState(false)
    const [playbackSpeed, _setPlaybackSpeed] = useState('1')
    const [currentTime, _setCurrentTime] = useState(0) // in seconds
    const [duration, _setDuration] = useState(0) // in seconds
    const [pbSpeedMenuState, setPbSpeedMenuState] = useState(false)

    const mutedRef = useRef(muted)
    const volumeRef = useRef(volume)
    const playingRef = useRef(playing)
    const playbackSpeedRef = useRef(playbackSpeed)
    const currentTimeRef = useRef(currentTime)
    const durationRef = useRef(duration)

    function downloadBase64File(data, fileName) {
        const downloadLink = document.createElement('a');
        document.body.appendChild(downloadLink);

        downloadLink.href = data;
        downloadLink.target = '_self';
        downloadLink.download = fileName;
        downloadLink.click();
        document.body.removeChild(downloadLink);
    }

    const setMuted = (value) => {
        mutedRef.current = value
        _setMuted(value)
    }
    const setVolume = (value) => {
        volumeRef.current = value
        _setVolume(value)
    }
    const setPlaying = (value) => {
        playingRef.current = value
        _setPlaying(value)
    }
    const setPlaybackSpeed = (value) => {
        playbackSpeedRef.current = value
        _setPlaybackSpeed(value)
    }
    const setCurrentTime = (value) => {
        currentTimeRef.current = value
        _setCurrentTime(value)
    }
    const setDuration = (value) => {
        durationRef.current = value
        _setDuration(value)
    }
    const leadingZeroFormatter = new Intl.NumberFormat(undefined, {
        minimumIntegerDigits: 2,
    })
    const formatDuration = (duration) => {
        const seconds = Math.floor(duration % 60)
        const minutes = Math.floor(duration / 60) % 60
        const hours = Math.floor(duration / 3600)

        return (hours > 0 ? `${hours}:` : '') + (minutes > 0 ? `${leadingZeroFormatter.format(minutes)}:` : '0:') + `${leadingZeroFormatter.format(seconds)}`
    }

    const audioRef = useRef(null)
    const audioContainerRef = useRef(null)
    const pbSpeedElementRef = useRef(null)

    useEffect(() => {
        playing ? audioRef.current.play() : audioRef.current.pause()
    }, [playing])
    useEffect(() => {
        audioRef.current.volume = volume
    }, [volume])
    useEffect(() => {
        audioRef.current.muted = muted
    }, [muted])
    useEffect(() => {
        audioRef.current.currentTime = currentTime
    }, [currentTime])
    useEffect(() => {
        audioRef.current.playbackRate = parseFloat(playbackSpeed)
    }, [playbackSpeed])
    useEffect(() => {
        document.addEventListener('click', (e) => {
            if (!e.composedPath().includes(pbSpeedElementRef.current)) {
                setPbSpeedMenuState(false)
            }
        })
        audioRef.current.addEventListener('loadeddata', () => {
            setDuration(audioRef.current.duration)
        })
        audioRef.current.addEventListener('timeupdate', () => {
            setCurrentTime(audioRef.current.currentTime)
        })
    }, [])

    // controls: play/pause, duration and current time, timeline, volume/mute, playback speed, download
    return (
        <div className={audioStyles.audioContainer} data-playing={playing} ref={audioContainerRef}>
            <div className={audioStyles.audioControls}>
                <button className={audioStyles.playPauseBtn} onClick={() => setPlaying(!playing)}>
                    {
                        playing ?
                            <svg viewBox="0 0 24 24">
                                <path fill="currentColor" d="M14,19H18V5H14M6,19H10V5H6V19Z" />
                            </svg> :
                            <svg viewBox="0 0 24 24">
                                <path fill="currentColor" d="M8,5.14V19.14L19,12.14L8,5.14Z" />
                            </svg>
                    }
                </button>
                <div className={audioStyles.duration}>
                    {formatDuration(currentTime)} / {formatDuration(duration)}
                </div>
                <div className={audioStyles.timeline}>
                    <input className={audioStyles.timelineInput} type="range" min="0" max={duration} value={currentTime} onChange={(e) => setCurrentTime(e.target.value)} />
                </div>
                <div className={audioStyles.volumeContainer}>
                    <button className={videoStyles.muteBtn} onClick={() => setMuted(!muted)}>
                        {
                            muted || volume == 0 ?
                                <svg viewBox="0 0 24 24">
                                    <path fill="currentColor" d="M12,4L9.91,6.09L12,8.18M4.27,3L3,4.27L7.73,9H3V15H7L12,20V13.27L16.25,17.53C15.58,18.04 14.83,18.46 14,18.7V20.77C15.38,20.45 16.63,19.82 17.68,18.96L19.73,21L21,19.73L12,10.73M19,12C19,12.94 18.8,13.82 18.46,14.64L19.97,16.15C20.62,14.91 21,13.5 21,12C21,7.72 18,4.14 14,3.23V5.29C16.89,6.15 19,8.83 19,12M16.5,12C16.5,10.23 15.5,8.71 14,7.97V10.18L16.45,12.63C16.5,12.43 16.5,12.21 16.5,12Z" />
                                </svg> :
                                (
                                    volume > .5 ?
                                        <svg viewBox="0 0 24 24">
                                            <path fill="currentColor" d="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.84 14,18.7V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z" />
                                        </svg> :
                                        <svg viewBox="0 0 24 24">
                                            <path fill="currentColor" d="M5,9V15H9L14,20V4L9,9M18.5,12C18.5,10.23 17.5,8.71 16,7.97V16C17.5,15.29 18.5,13.76 18.5,12Z" />
                                        </svg>
                                )
                        }
                    </button>
                    <input className={audioStyles.volumeSlider} type="range" min="0" max="1" step="any" defaultValue={1} onInput={(e) => {
                        setVolume(e.target.value)
                        if (muted) setMuted(false)
                    }} />
                </div>
                <div ref={pbSpeedElementRef} className={audioStyles.playBackSpeedContainer} onClick={
                    () => setPbSpeedMenuState(!pbSpeedMenuState)
                }>
                    {/* show menu of all playback speeds and highlight the one that is currently selected */}
                    <ul className={audioStyles.playBackSpeeds} data-open={pbSpeedMenuState}>
                        {
                            PLAYBACK_SPEEDS.map(speed => {
                                return <li key={speed} data-current={speed == playbackSpeed} className={audioStyles.playBackSpeed} onClick={() => setPlaybackSpeed(speed)}>{speed}x</li>
                            })
                        }
                    </ul>
                    <div className={audioStyles.currentPlayBackSpeed}>{playbackSpeed}x</div>
                </div>
                <div className={audioStyles.audioFileDownload} onClick={(e) => {
                    downloadBase64File(data, name)
                }}>file_download</div>
            </div>
            <audio ref={audioRef} key={data} src={data}>
            </audio>
        </div>
    )
}

export function DefaultFileView({ name, mimeType, data }) {
    function downloadBase64File(data, fileName) {
        const downloadLink = document.createElement('a');
        document.body.appendChild(downloadLink);

        downloadLink.href = data;
        downloadLink.target = '_self';
        downloadLink.download = fileName;
        downloadLink.click();
        document.body.removeChild(downloadLink);
    }

    const fileSize = data ? formatBytes((data.split(',')[1].length * (3 / 4)) - (data.endsWith('==') ? 2 : 1)) : 0 // base64 size formula
    const fileName = name.split('.').length > 1 ? name : name + '.' + mimeType.split('/')[1]
    return (
        <div className={fileStyles.fileViewContainer}>
            <div className={fileStyles.fileImage}>draft</div>
            <div className={fileStyles.fileInfo}>
                <a className={fileStyles.fileName} href={data} download={fileName} onClick={(e) => {
                    e.preventDefault()
                    downloadBase64File(data, name)
                }}>{fileName}</a>
                <div className={fileStyles.fileSize}>{fileSize}</div>
            </div>
            <div className={fileStyles.fileDownload} onClick={(e) => {
                downloadBase64File(data, name)
            }}>file_download</div>
        </div>
    )
}

export function NoGroupSelected() {
    return <></>
}

export function PageLoading() {
    return (
        <div style={{ width: '100%', height: '90%', display: "flex", justifyContent: "center", alignItems: "center", position: 'absolute' }}>
            <Spinner color={SPINNER_COLOR} height={'80px'} width={'80px'} thickness={'8px'} animationDuration={'1s'} animationTimingFunction={'cubic-bezier(0.62, 0.27, 0.08, 0.96)'} />
        </div>
    )
}