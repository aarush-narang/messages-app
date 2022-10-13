const SPINNER_COLOR = '#2e8283'
export const MAX_FILE_SIZE_BYTES = 50 * (1024 * 1024); // 50 MB in bytes
export const MAX_MESSAGE_LEN = 6000;
export const MINIMUM_GROUP_NAME_LENGTH = 5;
export const MINIMUM_GROUP_MEMBERS_SELECTED = 1;
export const MAXIMUM_GROUP_NAME_LENGTH = 20;

export function ChatComponent({ groups, currentGroupId, messageId, user, msgsState, socket, ctxMenu, ctxMenuPos, ctxMenuData, setNotificationState }) {
    if (currentGroupId && !(groups.find(group => group.id == currentGroupId))) {
        return (
            <></>
        )
    }
    if (!currentGroupId) return <NoGroupSelected />;

    const currentGroup = useMemo(() => groups.find(group => group.id == currentGroupId), [groups, currentGroupId])
    const [attachedFiles, _setAttachedFiles] = useState([]) // images to be uploaded
    const attachedFilesRef = useRef(attachedFiles)
    const setAttachedFiles = (files) => {
        attachedFilesRef.current = files
        _setAttachedFiles(files)
    }

    const [scrollButton, setScrollButton] = useState(false) // if the chat is scrolled high enough, show the scroll to bottom button
    const [msgsLoading, setMsgsLoading] = useState([]) // groups that have messages loading
    const [maxMessages, setMaxMessages] = useState([]) // groups that have reached their max messages
    const topEl = useRef(null) // the message at the top of the chat

    const [messages, _setMessages] = msgsState // messages of each group that have been loaded. Stored in parent component to avoid losing data when navigating between groups
    const messagesRef = useRef(messages)
    const setMessages = (msgs) => {
        messagesRef.current = msgs
        _setMessages(msgs)
    }
    const [messageLinkComplete, setMessageLinkComplete] = useState(false) // if the message that the user is trying to go to has been scrolled to already, don't scroll again
    const messageInputRef = useRef(null)
    const messageSubmitRef = useRef(null)
    function scrollMessagesDiv(pos = null, behavior) {
        const msgsContainer = document.querySelector(`.${chatStyles.messages}`)
        msgsContainer.scrollTo({ top: pos ? pos : msgsContainer.scrollHeight, behavior: behavior ? behavior : 'auto' }) // smooth scrolling not working: FIX
    }

    useEffect(async () => {
        if (!messages.find(grp => grp.id === currentGroup.id) && !msgsLoading.includes(currentGroup.id)) {
            // push group id to loading so that it doesn't load again
            setMsgsLoading([currentGroup.id].concat(msgsLoading))

            socket.emit('currentGroupChange-server', { groupId: currentGroup.id, accessToken: jsCookie.get('accessToken') }, (msgs) => {
                if (!msgs) return console.log('Error on server (currentGroupChange-server)');
                // push the messages to the messages array w/ group id
                setMessages([{ messages: [...msgs], id: currentGroup.id }].concat(messagesRef.current))
                // remove group from loading array
                setMsgsLoading(msgsLoading.filter(grp => grp !== currentGroup.id))
            })
        }
        // when messages load, scroll div all the way to the bottom
        scrollMessagesDiv()
    }, [currentGroup])
    useEffect(scrollMessagesDiv, [msgsLoading && !messages.find(grp => grp.id === currentGroup.id)]) // scroll to bottom when messages load for the first time only
    
    // for message links
    useEffect(() => {
        // check if messsage has already loaded, if not, send socket message to loadmessages-server to load messages, if it has, scroll to message and add some sort of highlight to the message
        if(messageLinkComplete) return;
        const grpMessages = messages.find(grp => grp.id === currentGroup.id)
        if (grpMessages) {
            const messageCheck = grpMessages.messages.find(msg => msg.id == messageId)
            if (messageCheck) {
                if (messageId) setMsgsLoading([currentGroup.id].concat(msgsLoading))
                const mId = messageCheck.id
                const mElement = document.getElementById(mId)
                if (mElement) {
                    scrollMessagesDiv(mElement.offsetTop, 'smooth')
                    setMessageLinkComplete(true)
                    mElement.classList.add(chatStyles.highlight)
                    setTimeout(() => {
                        mElement.classList.remove(chatStyles.highlight)
                    }, 3000)
                }
            } else {
                if (messageId) setMsgsLoading([currentGroup.id].concat(msgsLoading))
            }
        }
    }, [messageId, messages])
    useEffect(() => {
        const msgsContainer = document.querySelector(`.${chatStyles.messages}`)
        const curGrpMessages = messages.find(grp => grp.id === currentGroup.id)

        if (msgsLoading.includes(currentGroup.id) && curGrpMessages) {
            socket.emit('loadMessages-server', { accessToken: jsCookie.get('accessToken'), groupId: currentGroup.id, curMsgsCt: curGrpMessages.messages.length }, (newMsgs) => {
                // new messages are added to the top
                if (newMsgs && newMsgs.length > 0) {
                    const newAppendedMessages = newMsgs.concat(curGrpMessages.messages)
                    const newMsgsObj = [{ messages: newAppendedMessages, id: currentGroup.id }].concat(messagesRef.current.filter(grp => grp.id !== currentGroup.id))

                    // set top element in messages viewport 
                    const msgs = msgsContainer.querySelectorAll(`[id]`)
                    if (msgs) {
                        const topMsg = [...msgs].find(msg => msg.getBoundingClientRect().top > 0)
                        if (topMsg) {
                            topMsg.ref = topEl
                            topEl.current = topMsg
                        }
                    }

                    // set the new messages + the old messages
                    setMessages(newMsgsObj)

                    if (topEl.current) topEl.current.scrollIntoView()
                }
                else setMaxMessages([currentGroup.id].concat(maxMessages))
                setMsgsLoading(msgsLoading.filter(grp => grp !== currentGroup.id))
            })
        }
    }, [msgsLoading])

    useEffect(() => {
        if (messages.length <= 0) return;
        socket.on('messageCreate-client', (msg) => {
            const msgsContainer = document.querySelector(`.${chatStyles.messages}`)
            const scrollCond = msgsContainer ? msgsContainer.scrollTop == msgsContainer.scrollHeight - msgsContainer.clientHeight : false

            const files = msg.message.message.attachments
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
            if ((currentGroup.id == msg.groupId && scrollCond) || (msg.message.author && msg.message.author.uid == user.uid)) {
                scrollMessagesDiv()
            }
        })
        socket.on('messageDelete-client', (data) => {
            const groupID = data.groupId
            const messageID = data.messageId
            setMessages(messagesRef.current.map(grp => {
                if (grp.id == groupID) {
                    grp.messages = grp.messages.filter(msg => msg.id != messageID)
                }
                return grp
            }))
        })
        socket.on('messageEdit-client', (data) => {
            const groupID = data.groupId
            const messageID = data.messageId
            const newMessage = data.newMessage

            setMessages(messagesRef.current.map(grp => {
                if (grp.id == groupID) {
                    grp.messages = grp.messages.map(msg => {
                        if (msg.id == messageID) {
                            msg.message.content = newMessage
                            msg.edited = true
                        }
                        return msg
                    })
                }
                return grp
            }))
        })
    }, [messages.length])

    function handleFileInput(inputFiles) {
        const files = [...attachedFiles, ...inputFiles]
        const totalSizeBytes = (files.reduce((acc, file) => {
            return acc + file.size
        }, 0))
        if (totalSizeBytes > MAX_FILE_SIZE_BYTES) {
            setNotificationState({ state: 'error', data: { message: `Max File Size is ${formatBytes(MAX_FILE_SIZE_BYTES)}, your file(s) total ${formatBytes(totalSizeBytes)}` } })
            setAttachedFiles([])
        } else if (files.length > 5) {
            setNotificationState({ state: 'error', data: { message: `Max File Count is 5, your file(s) total ${files.length}` } })
        } else {
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
            const unreadFiles = [...inputFiles]
            for (let i = 0; i < files.length; i++) {
                readers.push(readFileAsText(unreadFiles[i]))
            }

            Promise.allSettled(readers).then(async (results) => {
                for (let i = 0; i < results.length; i++) {
                    if (results[i].status === 'fulfilled') {
                        setAttachedFiles([...attachedFilesRef.current, { base64: results[i].value, name: unreadFiles[i].name, mimeType: unreadFiles[i].type, blob: unreadFiles[i] }])
                    }
                }
            })
        }
    }

    // drag and drop states
    const [dragState, setDragState] = useState(false)
    const [dragTransitioning, setDragTransitioning] = useState(false)
    const [dragFileCount, setDragFileCount] = useState(['0'])
    const mainChatRef = useRef(null)

    return (
        <div className={chatStyles.main} ref={mainChatRef}
            onDragEnter={(e) => {
                e.preventDefault();
                e.stopPropagation()

                if (!e.dataTransfer.types.includes('Files')) return

                setDragTransitioning(true)
                setTimeout(function () {
                    setDragTransitioning(false)
                    setDragState(true)
                }, 0.001);
            }}
            onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation()

                if (!dragTransitioning) {
                    setDragState(false)
                }

                if (!e.dataTransfer.types.includes('Files')) return
            }}
            onDragOver={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (e.dataTransfer.items.length !== dragFileCount.length) setDragFileCount(new Array(e.dataTransfer.items.length).fill('0'))
            }}
            onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation()
                setDragState(false)

                if (e.dataTransfer.items) {
                    const items = [...e.dataTransfer.items]
                    handleFileInput(items.filter(i => {
                        if (i.getAsFile() && i.kind === 'file') return i.getAsFile()
                    }))
                }
            }}
        >
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
                    messagesRef.current.find(grp => grp.id === currentGroup.id) ?
                        messagesRef.current.find(grp => grp.id === currentGroup.id).messages.map(message => {
                            if (!message.system) {
                                return (
                                    <Message key={message.id} message={message} user={user} socket={socket} ctxMenu={ctxMenu} ctxMenuPos={ctxMenuPos} ctxMenuData={ctxMenuData} currentGroup={currentGroup} setNotificationState={setNotificationState} />
                                )
                            } else {
                                return (
                                    <SystemMessage key={message.id} message={message} user={user} socket={socket} ctxMenu={ctxMenu} ctxMenuPos={ctxMenuPos} ctxMenuData={ctxMenuData} currentGroup={currentGroup} setNotificationState={setNotificationState} />
                                )
                            }
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
                attachedFiles.length > 0 || dragState ?
                    <div className={fileStyles.attachedFilesContainer}>
                        {
                            attachedFiles.map((value, index) => {
                                const { base64, name } = value
                                if (!base64) return null
                                const mimeType = base64.split(',')[0].split(';')[0].split(':')[1]
                                const data = base64.split(',')[1]
                                const fileSize = data ? formatBytes((data * (3 / 4)) - (data.endsWith('==') ? 2 : 1)) : 0

                                value.id = index // set id for each file

                                return <AttachedFileView key={`${index}::${base64}`} id={index} mimeType={mimeType} name={name} fileSize={fileSize} data={base64} attachedFiles={attachedFiles} setAttachedFiles={setAttachedFiles} setNotificationState={setNotificationState} />
                            })
                        }
                        {
                            dragState ?
                                dragFileCount.map((v, i) => {
                                    return <div key={i} className={`${fileStyles.attachedFileViewContainer} ${fileStyles.attachedFileViewContainerEmpty}`}></div>
                                })
                                :
                                null
                        }
                    </div>
                    : null
            }
            {/* message input */}
            <div className={chatStyles.messageInputContainer}>
                <form className={chatStyles.messageInputForm} encType={"multipart/form-data"}
                    onClick={(e) => {
                        messageInputRef.current.focus()
                    }}
                    onSubmit={async (e) => {
                        e.preventDefault()
                        const msgInput = document.querySelector('[data-name="content"]')
                        const msgInputContainer = msgInput.parentElement
                        const msgInputParent = msgInputContainer.parentElement
                        const fileInput = document.querySelector('[data-name="files"]')
                        // get formdata
                        const formFiles = attachedFilesRef.current.map(i => {
                            return {
                                name: i.name,
                                data: i.blob,
                                mimeType: i.blob.type
                            }
                        })
                        const formDataObj = {
                            attachments: formFiles,
                            content: msgInput.innerText
                        }

                        // remove empty values
                        if (formDataObj.files && formDataObj.files.size === 0) formDataObj.files = []
                        // confirm message length
                        if (formDataObj.content.length > MAX_MESSAGE_LEN) {
                            return setNotificationState({ state: 'error', data: { message: 'Your message is too long!' } })
                        } else if (formDataObj.content.trim().length === 0 && formDataObj.attachments.length === 0) {
                            return
                        }
                        formDataObj.content = formDataObj.content.trim()

                        // send message
                        await socket.emit('messageCreate-server', { accessToken: jsCookie.get('accessToken'), groupId: currentGroup.id, message: formDataObj })
                        // reset form and images
                        setAttachedFiles([])
                        fileInput.value = ''
                        msgInput.innerText = ''
                        msgInput.style.height = null
                        msgInputContainer.style.height = null
                        msgInputParent.dataset.length = '0'
                        msgInputParent.dataset.overflow = ''
                    }}
                >
                    <div className={chatStyles.messageButtons}>
                        <input data-name={'files'} id={'file-upload'} type={"file"} style={{ display: 'none' }} multiple
                            onInput={(e) => {
                                handleFileInput(e.target.files)
                                e.target.value = '' // reset files in this input so that multiple of the same file can be uploaded and you can upload multiple times
                            }}
                        />
                        <label htmlFor={"file-upload"} className={chatStyles.fileUpload}>
                            file_upload
                        </label>
                        <button type={"submit"} className={chatStyles.messageInputSubmit} ref={messageSubmitRef}>send</button>
                    </div>

                    <div className={chatStyles.messageTextContainer} data-length="0" data-overflow="">
                        <div className={chatStyles.contentEditableMessageAreaContainer}>
                            <div data-name={'content'} className={chatStyles.contentEditableMessageArea} ref={messageInputRef} contentEditable={true} role="textbox" data-placeholder={`Message ${currentGroup.members.length == 2 ? '@' : ''}${currentGroup.name}`}
                                onPaste={(e) => {
                                    e.preventDefault()
                                    handleFileInput(e.clipboardData.files)
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
                                onKeyDown={(e) => {
                                    if (e.key == 'Enter' && !e.shiftKey) {
                                        e.preventDefault()
                                        messageSubmitRef.current.click() // submit form
                                        return
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