// Styles
import styles from "../../styles/Home.module.css";
import chatStyles from "../../styles/ChatStyles/ChatComponentStyles.module.css";
import groupStyles from "../../styles/ChatStyles/GroupComponentStyles.module.css";
import videoStyles from "../../styles/FileViews/VideoOverlay.module.css";
import audioStyles from "../../styles/FileViews/AudioOverlay.module.css";
import fileStyles from "../../styles/FileViews/FileViews.module.css";
import contextMenuStyles from "../../styles/ContextMenuStyles.module.css";
// Util + React Hooks + Components
import { useState, useEffect, useRef } from "react";
import { useDebounce, shortenName, formatBytes, shortenFileName, calculateFileSize, downloadBase64File, getIndicesOf } from "./util";
import { Spinner } from "./formComponents";
// Util Packages
import jsCookie from "js-cookie";
import moment from "moment";
// Code Highlighting
import hljs from 'highlight.js'
import 'highlight.js/styles/atom-one-dark.css'
// Markdown Parser
import { marked } from "marked";

const SPINNER_COLOR = '#2e8283'
const MAX_FILE_SIZE_BYTES = 100 * (1024 * 1024); // 100 MB in bytes (100 is MB)
const MAX_MESSAGE_LEN = 6000

// Main Components For Chat
export function GroupsComponent({ groups, csrfToken, currentGroup, user, socket }) {
    if (currentGroup && !(groups.find(group => group.id == currentGroup.id))) { // if current group is not in groups, render spinner
        return (
            <PageLoading />
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
        socket.emit('updateGroupOrder-server', { accessToken: jsCookie.get('accessToken'), order })
    }, 1000, [order])

    useEffect(() => { // update the order of the groups (visually) when the order changes
        const draggables = document.querySelectorAll(`.${groupStyles.group}`);
        const container = document.querySelector(`.${groupStyles.groups}`);
        draggables.forEach(draggable => {
            draggable.addEventListener('dragstart', () => {
                draggable.classList.add(groupStyles.dragging);
            });
            draggable.addEventListener('dragend', () => {
                draggable.classList.remove(groupStyles.dragging);
            });
        })

        container.addEventListener('dragover', e => {
            e.preventDefault()
            const afterElement = getDragAfterElement(container, e.clientY)
            const draggable = document.querySelector(`.${groupStyles.dragging}`)
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
            const draggableElements = [...container.querySelectorAll(`.${groupStyles.group}:not(.${groupStyles.dragging})`)]

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
            className={groupStyles.left}
            style={{
                minWidth: menuState ? '46px' : '350px',
                width: menuState ? '46px' : '360px',
                maxWidth: menuState ? '46px' : '700px',
                resize: menuState ? 'none' : 'horizontal',
                overflow: 'hidden',
            }}
        ><div className={groupStyles.groupsContainer}>
                <div className={groupStyles.groups} style={{ opacity: menuState ? '0' : '1' }}>
                    {
                        groups.length > 0 ?
                            groups.map(group => {
                                return (
                                    // group container
                                    <div key={group.id} data-groupid={group.id} data-selected={currentGroup && group.id == currentGroup.id} className={groupStyles.group} draggable onClick={() => {
                                        if (currentGroup && group.id == currentGroup.id) {
                                            history.pushState({ currentGroup: null }, null, `/`)
                                            dispatchEvent(new PopStateEvent('popstate', { state: { currentGroup: null } }))
                                        } else {
                                            history.pushState({ currentGroup: group }, null, `/groups/${group.id}`)
                                            dispatchEvent(new PopStateEvent('popstate', { state: { currentGroup: group } }))
                                        }

                                    }}>
                                        <div className={groupStyles.groupImage}>
                                            {
                                                group.icon ? <img title={`${group.name}'s icon`} src={`/api/v1/data/images/${group.icon}`} loading={"lazy"} className={groupStyles.groupImage} alt={`${group.name}'s icon`} /> :
                                                    <img title={`${group.name}'s icon`} src={`/api/v1/data/images/default`} loading={"lazy"} className={groupStyles.groupImage} alt={`${group.name}'s icon`} />
                                            }
                                        </div>
                                        <div className={groupStyles.groupInfo}>
                                            <h4 title={group.name} className={groupStyles.groupTitle}>{shortenName(group.name)}</h4>
                                            <div title={`Members: ${group.members.length}`} className={groupStyles.numOfMembers}>Members: {group.members.length}</div>
                                        </div>
                                        <div className={groupStyles.lastMsg}></div>
                                    </div>
                                )
                            }) :
                            <div className={groupStyles.noGroupsContainer}>
                                <div></div>
                                <h2 style={{ textAlign: 'center' }}>No Direct Messages or Groups created/joined</h2>
                                <div className={groupStyles.joinGroup} onClick={() => {
                                    // TODO: pop up a modal to create a group or to create a dm
                                }}>control_point</div>
                                <div></div>
                            </div>
                    }
                </div>
                {
                    groups.length > 0 ?
                        <div style={{ display: `${menuState ? 'none' : 'flex'}`, justifyContent: 'center' }}>
                            <div className={groupStyles.joinGroup} style={{ marginTop: '20px', fontSize: '50px' }} onClick={() => {
                                // TODO: pop up a modal to create a group or to create a dm
                            }}>control_point</div>
                        </div> :
                        null

                }
            </div>
            <a className={groupStyles.arrow} style={{ transform: `${menuState ? 'rotate(180deg)' : 'rotate(0deg)'}` }} onClick={
                (e) => {
                    setMenuState(!menuState)
                }
            }>&#171;</a>
        </div>
    );
}
export function ChatComponent({ groups, csrfToken, currentGroup, user, msgsState, socket }) {
    if (currentGroup && !(groups.find(group => group.id == currentGroup.id))) {
        return (
            <PageLoading />
        )
    }
    if (!currentGroup) return <NoGroupSelected />
    const [img, setImg] = useState([]) // images to be uploaded
    const [scrollButton, setScrollButton] = useState(false) // if the chat is scrolled high enough, show the scroll to bottom button
    const [msgsLoading, setMsgsLoading] = useState([]) // groups that have messages loading
    const [maxMessages, setMaxMessages] = useState([]) // groups that have reached their max messages
    const [inCodeBlock, setInCodeBlock] = useState(false) // if the user is in a code block
    const [cursorPosition, setCursorPosition] = useState(0) // the cursor position in the message input
    const topEl = useRef(null) // the message at the top of the chat

    const [messages, _setMessages] = msgsState // messages of each group that have been loaded. Stored in parent component to avoid losing data when navigating between groups
    const messagesRef = useRef(messages)

    const setMessages = (msgs) => {
        messagesRef.current = msgs
        _setMessages(msgs)
    }

    function scrollMessagesDiv(pos = null) {
        const msgsContainer = document.querySelector(`.${chatStyles.messages}`)
        msgsContainer.scrollTo(null, pos ? pos : msgsContainer.scrollHeight)
    }

    useEffect(async () => {
        if (!messages.find(grp => grp.id === currentGroup.id) && !msgsLoading.includes(currentGroup.id)) {
            // push group id to loading so that it doesn't load again
            setMsgsLoading([currentGroup.id].concat(msgsLoading))

            socket.emit('currentGroupChange-server', { groupId: currentGroup.id, accessToken: jsCookie.get('accessToken') }, (msgs) => {
                if (!msgs) return console.log('Error on server (currentGroupChange-server)');
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
        const msgsContainer = document.querySelector(`.${chatStyles.messages}`)
        const curGrpMessages = messages.find(grp => grp.id === currentGroup.id)

        if (msgsLoading.includes(currentGroup.id) && curGrpMessages) {
            socket.emit('loadMessages-server', { accessToken: jsCookie.get('accessToken'), groupId: currentGroup.id, curMsgsCt: curGrpMessages.messages.length }, (newMsgs) => {
                // new messages are added to the top
                if (newMsgs && newMsgs.length > 0) {
                    const newAppendedMessages = newMsgs.concat(curGrpMessages.messages)
                    const newMsgsObj = [{ messages: newAppendedMessages, id: currentGroup.id }].concat(messages.filter(grp => grp.id !== currentGroup.id))

                    // set top element in messages viewport 
                    const msgs = msgsContainer.querySelectorAll(`.${chatStyles.message}`)
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

    useEffect(() => {
        if (messages.length <= 0) return;
        socket.on('messageCreate-client', (msg) => {
            const msgsContainer = document.querySelector(`.${chatStyles.messages}`)
            const scrollCond = msgsContainer.scrollTop == msgsContainer.scrollHeight - msgsContainer.clientHeight

            const files = msg.message.message.files
            if (files) {
                // convert array buffer files to base64
                for (let i = 0; i < files.length; i++) {
                    files[i].data = Buffer.from(files[i].data, 'binary').toString('base64')
                }
            }
            const grpMsgs = messagesRef.current.find(grp => grp.id === msg.groupId)
            let newMsgsObj
            if (grpMsgs) {
                const newMsgs = grpMsgs.messages.concat([msg.message])
                newMsgsObj = [{ messages: newMsgs, id: msg.groupId }].concat(messagesRef.current.filter(grp => grp.id !== msg.groupId))
            } else {
                newMsgsObj = [{ messages: [msg.message], id: msg.groupId }].concat(messagesRef.current.filter(grp => grp.id !== msg.groupId))
            }
            setMessages(newMsgsObj)

            // if the message is in the current group and the chat is scrolled to the bottom or if the message is from the user
            if ((currentGroup.id == msg.groupId && scrollCond) || msg.message.author.uid == user.uid) {
                scrollMessagesDiv()
            }
        })
    }, [messages.length > 0])

    return (
        <div className={chatStyles.main}>
            {/* messages display */}
            <div className={chatStyles.messages}
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
                        <div className={chatStyles.msgsLoading}>
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
                        <div className={chatStyles.msgsLoading}>
                            <Spinner width={'40px'} height={'40px'} color={SPINNER_COLOR} thickness={'5px'} />
                        </div>
                }
            </div>
            {/* scroll down button */}
            <div className={chatStyles.scrollContainer} style={{ opacity: scrollButton ? '' : '0', pointerEvents: scrollButton ? '' : 'none' }} onClick={
                (e) => {
                    const msgsContainer = document.querySelector(`.${chatStyles.messages}`)
                    msgsContainer.scrollTo({ top: msgsContainer.scrollHeight, behavior: 'smooth' })
                }
            }>
                <span className={chatStyles.overflowButton} title={"Scroll To Bottom"}>keyboard_double_arrow_down</span>
            </div>
            {/* message part */}
            {/* images */}
            {
                img.map(i => {
                    const { base64, name } = i
                    if (!base64) return null
                    const mimeType = base64.split(',')[0].split(';')[0].split(':')[1]
                    const data = base64.split(',')[1]
                    const fileSize = data ? formatBytes((data * (3 / 4)) - (data.endsWith('==') ? 2 : 1)) : 0
                    const type = mimeType.split('/')[1]
                    switch (type) {
                        case 'apng':
                        case 'avif':
                        case 'jpeg':
                        case 'png':
                        case 'svg':
                        case 'webp':
                            return <img key={data} className={fileStyles.messageFile} alt={name} src={base64} />
                        default:
                            return <DefaultFileView key={data} mimeType={mimeType} name={name} fileSize={fileSize} data={base64} />
                    }
                })
            }
            {/* message input */}
            <div className={chatStyles.messageInputContainer}>
                <form className={chatStyles.messageInputForm} encType={"multipart/form-data"} onSubmit={
                    async (e) => {
                        const msgInput = document.querySelector('[data-name="content"]')
                        const msgInputContainer = msgInput.parentElement
                        const msgInputParent = msgInputContainer.parentElement
                        const fileInput = document.querySelector('[data-name="files"]')
                        e.preventDefault()
                        // get formdata
                        const formDataObj = {
                            files: fileInput.value,
                            content: msgInput.innerText
                        }
                        // remove empty values
                        if (formDataObj.files && formDataObj.files.size === 0) formDataObj.files = []
                        // confirm message length
                        if (formDataObj.content.length > MAX_MESSAGE_LEN) {
                            return alert('Message too long!')
                        } else if (formDataObj.content.trim().length === 0 && formDataObj.files.length === 0) {
                            fileInput.value = ''
                            msgInput.innerText = ''
                            return alert('Message cannot be empty!')
                        }
                        formDataObj.content = formDataObj.content.trim()
                        // set files
                        const files = [...e.target.querySelector('[data-name="files"]').files]
                        const fileObjs = []
                        for (let i = 0; i < files.length; i++) {
                            fileObjs.push({
                                name: files[i].name,
                                data: files[i],
                                mimeType: files[i].type
                            })
                        }
                        formDataObj.files = fileObjs

                        // send message
                        await socket.emit('messageCreate-server', { accessToken: jsCookie.get('accessToken'), groupId: currentGroup.id, message: formDataObj })
                        // reset form and images
                        setImg([])
                        fileInput.value = ''
                        msgInput.innerText = ''
                        msgInput.style.height = null
                        msgInputContainer.style.height = null
                        msgInputParent.dataset.length = '0'
                        msgInputParent.dataset.overflow = ''
                    }
                }>
                    <div className={chatStyles.messageButtons}>
                        <input data-name={'files'} id={'file-upload'} type={"file"} style={{ display: 'none' }} multiple onInput={(e) => {
                            const files = [...img, ...e.target.files]
                            const totalSizeBytes = (files.reduce((acc, file) => {
                                return acc + file.size
                            }, 0))
                            if (totalSizeBytes > MAX_FILE_SIZE_BYTES) {
                                // TODO: show error on a modal
                                alert(`Max File Size is ${formatBytes(MAX_FILE_SIZE_BYTES)}, your file(s) total ${formatBytes(totalSizeBytes)}`)
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
                        <label htmlFor={"file-upload"} className={chatStyles.fileUpload}>
                            file_upload
                        </label>
                        <button type={"submit"} className={chatStyles.messageInputSubmit} data-messagesubmit>send</button>
                    </div>

                    <div className={chatStyles.messageTextContainer} data-length="0" data-overflow=""
                        onClick={(e) => {
                            document.querySelector('[role="textbox"]').focus()
                        }}
                    >
                        <div className={chatStyles.contentEditableMessageAreaContainer}>
                            <div data-name={'content'} className={chatStyles.contentEditableMessageArea} contentEditable={true} role="textbox" data-placeholder={`Message ${currentGroup.members.length == 2 ? '@' : ''}${currentGroup.name}`}
                                onPaste={(e) => {
                                    e.preventDefault()
                                    const text = e.clipboardData.getData('text/plain')
                                    document.execCommand('insertText', false, text)
                                    e.target.scrollTop = e.target.scrollHeight * 1000
                                }}
                                onInput={(e) => { // validating characters length
                                    const text = e.target.innerText
                                    const parent = e.target.parentElement
                                    const mainCont = parent.parentElement

                                    // scroll height
                                    e.target.style.height = 'auto';
                                    e.target.parentElement.style.height = 'auto'
                                    const newHeight = text.length == 0 ? null : (e.target.scrollHeight + 2) + 'px';
                                    e.target.style.height = newHeight
                                    e.target.parentElement.style.height = newHeight

                                    // validating length
                                    if (MAX_MESSAGE_LEN - text.length < 0) {
                                        mainCont.dataset.length = MAX_MESSAGE_LEN - text.length
                                        mainCont.dataset.overflow = 'error'
                                    } else if (MAX_MESSAGE_LEN - text.length <= 500) {
                                        mainCont.dataset.length = text.length
                                        mainCont.dataset.overflow = 'warn'
                                    } else {
                                        mainCont.dataset.length = text.length
                                        mainCont.dataset.overflow = ''
                                    }

                                }}
                                onSelect={(e) => { // TODO: fix the selection thing not working with contenteditable
                                    const text = e.target.innerText
                                    const codeBlockIndices = getIndicesOf('```', text, false)
                                    if (codeBlockIndices.length === 0) return
                                    if (codeBlockIndices.length % 2 !== 0) codeBlockIndices.push(null)

                                    // check if the cursor is in a code block
                                    const states = []
                                    for (let i = 0; i < codeBlockIndices.length; i += 2) {
                                        const start = codeBlockIndices[i]
                                        const end = codeBlockIndices[i + 1]

                                        if (e.target.selectionStart === e.target.selectionEnd && e.target.selectionStart >= start + 3 && e.target.selectionStart <= end) {
                                            states.push(true)
                                        } else if (!end && e.target.selectionStart === e.target.selectionEnd && e.target.selectionStart >= start + 3) {
                                            states.push(true)
                                        } else {
                                            states.push(false)
                                        }
                                    }

                                    if (states.includes(true)) setInCodeBlock(true)
                                    else setInCodeBlock(false)

                                    setCursorPosition(e.target.selectionStart)
                                }}
                                onKeyDown={(e) => { // TODO: fix the selection thing not working with contenteditable
                                    if (e.key == 'Enter' && !e.shiftKey && !inCodeBlock) {
                                        e.preventDefault()
                                        document.querySelector('[data-messagesubmit="true"]').click() // submit form
                                        return
                                    }
                                    if (inCodeBlock) {
                                        switch (e.key) {
                                            case 'Enter':
                                                e.preventDefault()
                                                // insert new line at cursor
                                                e.target.innerText = e.target.innerText.substring(0, cursorPosition) + '\n' + e.target.innerText.substring(cursorPosition)
                                                e.target.setSelectionRange(cursorPosition + 1, cursorPosition + 1)

                                                // readjust height
                                                e.target.style.height = null;
                                                e.target.parentElement.style.height = null

                                                // scroll down one line (based off line height)
                                                e.target.scrollTop = e.target.scrollTop + 22
                                                break
                                            case 'Tab':
                                                e.preventDefault()
                                                // insert tab at cursor
                                                e.target.innerText = e.target.innerText.substring(0, cursorPosition) + '\t' + e.target.innerText.substring(cursorPosition)
                                                e.target.setSelectionRange(cursorPosition + 1, cursorPosition + 1)
                                                break
                                        }
                                    }
                                }}
                            >
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}
export function Message({ message, user }) {
    const codeBlocks = message.message.content.split('```')
    return (
        <div id={message.id} className={chatStyles.message} data-timestamp={message.createdAt} data-sender={message.author.uid == user.uid}
            onContextMenu={(e) => {
                console.log('message context menu')
                console.log(e.nativeEvent.composedPath())
            }}
        >
            <img className={chatStyles.messageIcon} src={`/api/v1/data/images/${message.author.icon}`} loading={"lazy"} alt={`${message.author.username}'s icon`} />

            <div className={chatStyles.messageContainer}>
                <div className={chatStyles.messageHeader}>
                    <h4 className={chatStyles.messageAuthor}>{message.author.username}</h4>
                    <div className={chatStyles.messageInfo}>
                        <div className={chatStyles.messageInfoSect}>
                            <span className={chatStyles.messageTS} title={moment(message.createdAt).format('llll')}>{moment(message.createdAt).fromNow()}</span>
                            <span className={chatStyles.messageEdited} title={"This message was edited."}>{message.edited ? '(edited)' : ''}</span>
                        </div>
                        <span className={chatStyles.messageOptions}>more_horiz</span>
                    </div>
                </div>
                <div className={chatStyles.messageBody} >
                    <div className={chatStyles.messageContentContainer}>
                        {
                            codeBlocks.length >= 3 ? (
                                codeBlocks.map((codeBlock, i) => {
                                    if ((i + 1) % 2 == 0) {
                                        return (
                                            <pre key={i} className={chatStyles.messageContentCode} dangerouslySetInnerHTML={{ __html: hljs.highlightAuto(codeBlock).value }}>
                                            </pre>
                                        )
                                    } else {
                                        return (
                                            <div key={i} className={chatStyles.messageContentMarkdown} dangerouslySetInnerHTML={{ __html: marked(codeBlock) }} ></div>
                                        )
                                    }
                                })
                            ) : (
                                <div className={chatStyles.messageContentMarkdown}>{message.message.content}</div>
                            )
                        }
                    </div>
                    <div className={chatStyles.messageFiles}>{message.message.files.map((fileInfo) => {
                        const data = Buffer.isBuffer(fileInfo.data) ? fileInfo.data.toString('base64') : fileInfo.data
                        const fileSize = data ? calculateFileSize(data) : 0
                        const name = fileInfo.name

                        const mimeType = fileInfo.mimeType
                        const generalType = mimeType.split('/')[0]
                        const specificType = mimeType.split('/')[1]

                        switch (true) { // HIGH PRIORITY FIX: MEMORY LEAK HERE WHEN GROUP IS CHANGED & FILES ARE RE-RENDERED OR REMOVED
                            case generalType === 'image' && specificType === 'apng':
                            case generalType === 'image' && specificType === 'avif':
                            case generalType === 'image' && specificType === 'jpeg':
                            case generalType === 'image' && specificType === 'png':
                            case generalType === 'image' && specificType === 'svg':
                            case generalType === 'image' && specificType === 'webp':
                                return <ImageFileView key={data} alt={name} data={data} name={name} mimeType={mimeType} fileSize={fileSize} />
                            // case generalType === 'audio' && specificType === 'ogg':
                            // case generalType === 'audio' && specificType === 'mp3':
                            // case generalType === 'audio' && specificType === 'wav':
                            // case generalType === 'audio' && specificType === 'mpeg':
                            //     return <AudioFileView key={data} mimeType={mimeType} name={name} fileSize={fileSize} data={`data:${mimeType};base64,${data}`} />
                            case generalType === 'video' && specificType === 'ogg':
                            case generalType === 'video' && specificType === 'mp4':
                            case generalType === 'video' && specificType === 'webm':
                                return <VideoFileView key={data} name={name} mimeType={mimeType} fileSize={fileSize} data={`data:${mimeType};base64,${data}`} />
                            case generalType === 'text':
                                return <TextFileView key={data} data={data} fileSize={fileSize} mimeType={mimeType} name={name} />
                            // case generalType === 'text' && specificType === 'markdown': // TODO: markdown viewer
                            //     return (
                            //         <div>
                            //             {marked.parse(Buffer.from(`data:${mimeType};base64,${data}`, 'base64').toString('utf-8'))}
                            //         </div>
                            //     )
                            default:
                                return <DefaultFileView key={data} mimeType={mimeType} name={name} fileSize={fileSize} data={`data:${mimeType};base64,${data}`} />
                        }
                    })}</div>
                </div>
            </div>
        </div>
    )
}

// Message File Views
export function TextFileView({ name, mimeType, data, fileSize }) {
    const [textFileState, setTextFileState] = useState(false)
    return (
        <pre key={data} wrap={"true"} className={fileStyles.messageFile}>
            <div className={fileStyles.preHeader}>
                <div className={fileStyles.preTitle}>
                    <div style={{ fontSize: '15px' }}>{shortenFileName(name, 10)}</div>
                    <div className={fileStyles.preButtons}>
                        <div className={fileStyles.preButton} onClick={() => {
                            setTextFileState(!textFileState)
                        }}>{textFileState ? 'unfold_less' : 'unfold_more'}</div>
                        <div className={fileStyles.preButton} onClick={() => downloadBase64File(`data:${mimeType};base64,${data}`, name)}>file_download</div>
                        <div className={fileStyles.preFileSize}>{fileSize}</div>
                    </div>
                </div>
                <span className={fileStyles.divider}></span>
            </div>
            {
                textFileState ?
                    Buffer.from(data, 'base64').toString('utf-8') :
                    null
            }
        </pre>
    )
}

// MEMORY LEAK FIX WITH VIDEO AND AUDIO VIEWS
export function VideoFileView({ data, name, mimeType, fileSize }) {
    const PLAYBACK_SPEEDS = ['0.25', '0.5', '0.75', '1', '1.25', '1.5', '1.75', '2']
    const [playing, _setPlaying] = useState(false) // true = playing, false = paused
    const [fullscreen, _setFullscreen] = useState(false) // true = fullscreen, false = not fullscreen
    const [volume, _setVolume] = useState(1) // 0 to 1
    const [muted, _setMuted] = useState(false)
    const [playbackSpeed, _setPlaybackSpeed] = useState('1')
    const [currentTime, _setCurrentTime] = useState(0) // in seconds
    const [currentTimeInternal, _setCurrentTimeInternal] = useState(0) // in seconds
    const [duration, _setDuration] = useState(0) // in seconds
    const [pbSpeedMenuState, setPbSpeedMenuState] = useState(false)

    const mutedRef = useRef(muted)
    const volumeRef = useRef(volume)
    const playingRef = useRef(playing)
    const fullscreenRef = useRef(fullscreen)
    const playbackSpeedRef = useRef(playbackSpeed)
    const currentTimeRef = useRef(currentTime)
    const currentTimeRefInternal = useRef(currentTimeInternal)
    const durationRef = useRef(duration)

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
        currentTimeRefInternal.current = value
        currentTimeRef.current = value
        _setCurrentTime(value)
    }
    const setCurrentTimeInternal = (value) => { // changed by video element, uses different state to prevent infinite loop with useEffect below
        currentTimeRefInternal.current = value
        currentTimeRef.current = value
        _setCurrentTimeInternal(value)
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

    useEffect(async () => {
        playing ? await videoRef.current.play() : await videoRef.current.pause()
    }, [playing])
    useEffect(() => {
        if (document.fullscreenElement == null && fullscreen) {
            videoContainerRef.current.requestFullscreen()
        } else if (document.fullscreenElement) {
            document.exitFullscreen()
        }

        return () => {
            if (document.fullscreenElement) {
                document.exitFullscreen()
            }
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
        document.addEventListener('fullscreenchange', () => {
            setFullscreen(document.fullscreenElement != null)
        })
        document.addEventListener('click', (e) => {
            if (!e.composedPath().includes(pbSpeedElementRef.current)) {
                setPbSpeedMenuState(false)
            }
        })

        return () => {
            data = null
            name = null
            mimeType = null
            fileSize = null
        }
    }, [])
    return (
        <div className={videoStyles.videoContainer} data-playing={playing} data-fullscreen={fullscreen} ref={videoContainerRef}>
            <div className={videoStyles.videoInformationContainer}>
                <div className={videoStyles.videoInformation}>
                    <div className={videoStyles.videoHeader}>
                        <div className={videoStyles.videoFileName} title={name}>{shortenFileName(name, 20)}</div>
                        <div className={videoStyles.videoFileSize} title={fileSize}>{fileSize}</div>
                    </div>
                    <div className={videoStyles.videoDownload} title={`Download ${name}`} onClick={() => downloadBase64File(data, name)}>file_download</div>
                </div>
            </div>
            <div className={videoStyles.videoControlsContainer}>
                <div className={videoStyles.timelineContainer}>
                    <input className={videoStyles.timeline} step={'any'} type="range" min="0" max={durationRef.current} value={currentTimeRef.current} onChange={(e) => setCurrentTime(e.target.value)} />
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
                        <div className={videoStyles.currentTime}>{formatDuration(currentTimeRef.current)}</div>
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
                                    return <li key={speed} data-current={speed == playbackSpeedRef.current} className={videoStyles.playBackSpeed} onClick={() => setPlaybackSpeed(speed)}>{speed}x</li>
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
            <video preload={"auto"} key={data} src={data} className={videoStyles.video} ref={videoRef}
                onClick={() => setPlaying(!playing)}
                onLoadedData={(e) => setDuration(e.target.duration)}
                onTimeUpdate={(e) => setCurrentTimeInternal(e.target.currentTime)}
            ></video>
        </div>
    )
}
export function AudioFileView({ data, name, mimeType, fileSize }) {
    const PLAYBACK_SPEEDS = ['0.25', '0.5', '0.75', '1', '1.25', '1.5', '1.75', '2']
    const [playing, _setPlaying] = useState(false) // true = playing, false = paused
    const [volume, _setVolume] = useState(1) // 0 - 1
    const [muted, _setMuted] = useState(false)
    const [playbackSpeed, _setPlaybackSpeed] = useState('1')
    const [currentTime, _setCurrentTime] = useState(0) // in seconds
    const [currentTimeInternal, _setCurrentTimeInternal] = useState(0) // in seconds
    const [duration, _setDuration] = useState(0) // in seconds
    const [pbSpeedMenuState, setPbSpeedMenuState] = useState(false)

    const mutedRef = useRef(muted)
    const volumeRef = useRef(volume)
    const playingRef = useRef(playing)
    const playbackSpeedRef = useRef(playbackSpeed)
    const currentTimeRef = useRef(currentTime)
    const currentTimeRefInternal = useRef(currentTimeInternal)
    const durationRef = useRef(duration)

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
    const setCurrentTimeInternal = (value) => {
        currentTimeRefInternal.current = value
        currentTimeRef.current = value
        _setCurrentTimeInternal(value)
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
                    {formatDuration(currentTimeRef.current)} / {formatDuration(duration)}
                </div>
                <div className={audioStyles.timeline}>
                    <input className={audioStyles.timelineInput} type="range" min="0" max={duration} value={currentTimeRef.current} onChange={(e) => setCurrentTime(e.target.value)} />
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
                <div className={audioStyles.audioFileDownload} title={`Download ${name}`} onClick={(e) => {
                    downloadBase64File(data, name)
                }}>file_download</div>
            </div>
            <audio ref={audioRef} key={data} src={data}
                onLoadedData={(e) => setDuration(e.target.duration)}
                onTimeUpdate={(e) => setCurrentTimeInternal(e.target.currentTime)}
            >
            </audio>
        </div>
    )
}


export function ImageFileView({ data, name, mimeType, fileSize }) {
    return <img className={fileStyles.messageFile} alt={name} src={`data:${mimeType};base64,${data}`} title={name} />
}
export function DefaultFileView({ data, name, mimeType, fileSize }) {
    return (
        <div className={fileStyles.fileViewContainer}>
            <div className={fileStyles.fileImage}>draft</div>
            <div className={fileStyles.fileInfo}>
                <a className={fileStyles.fileName} title={name} href={data} download={name} onClick={(e) => {
                    e.preventDefault()
                    downloadBase64File(data, name)
                }}>{shortenFileName(name, 8)}</a>
                <div className={fileStyles.fileSize} title={fileSize}>{fileSize}</div>
            </div>
            <div className={fileStyles.fileDownload} onClick={(e) => {
                downloadBase64File(data, name)
            }}>file_download</div>
        </div>
    )
}

// Extra
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

// Custom Context Menu
export function ContextMenu({ x, y, type }) {
    // messages, groups, users, files, 

}
export function MesasgeContextMenu({ message }) {
    return (// message id, copy message content, delete message if author, 
        <div className={contextMenuStyles.contextMenuContainer}>
            <div className={contextMenuStyles.contextMenuItem}>
                <div className={contextMenuStyles.contextMenuItemText}></div>
                <div className={contextMenuStyles.contextMenuItemIcon}>
                    <svg class="icon-E4cW1l" aria-hidden="false" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M5 2C3.34315 2 2 3.34315 2 5V19C2 20.6569 3.34315 22 5 22H19C20.6569 22 22 20.6569 22 19V5C22 3.34315 20.6569 2 19 2H5ZM8.79741 7.72V16H6.74541V7.72H8.79741ZM13.2097 7.72C16.0897 7.72 17.5897 9.388 17.5897 11.848C17.5897 14.308 16.0537 16 13.2577 16H10.3537V7.72H13.2097ZM13.1497 14.404C14.6137 14.404 15.5257 13.636 15.5257 11.86C15.5257 10.12 14.5537 9.316 13.1497 9.316H12.4057V14.404H13.1497Z"></path></svg>
                </div>
            </div>
            <div className={contextMenuStyles.contextMenuItem}>
                <div className={contextMenuStyles.contextMenuItemText}></div>
                <div className={contextMenuStyles.contextMenuItemIcon}></div>
            </div>
            <div className={contextMenuStyles.contextMenuItem}>
                <div className={contextMenuStyles.contextMenuItemText}></div>
                <div className={contextMenuStyles.contextMenuItemIcon}></div>
            </div>
        </div>
    )
}
export function GroupContextMenu() {

}
export function UserContextMenu() {

}
export function FileContextMenu() {

}