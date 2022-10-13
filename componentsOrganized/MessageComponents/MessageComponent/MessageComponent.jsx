export function MessageComponent({ message, user, currentGroup, socket, ctxMenu, ctxMenuPos, ctxMenuData, setNotificationState }) {
    const [contextMenu, setContextMenu] = ctxMenu
    const [contextMenuPos, setContextMenuPos] = ctxMenuPos
    const [contextMenuData, setContextMenuData] = ctxMenuData

    const messageEditDivRef = useRef(null)
    const [messageEdit, setMessageEdit] = useState(false) // if message is being edited currently

    const [messageEditOverflow, setMessageEditOverflow] = useReferredState(false) // false, warn, error
    const [messageEditLength, setMessageEditLength] = useReferredState(0) // length of message when overflowing

    useEffect(() => {
        if (messageEdit) {
            messageEditDivRef.current.focus()
        }
    }, [messageEdit])

    function handleContextMenuFile(e, filedata, filename, filesize, mimeType, dimensions) {
        e.preventDefault()
        const path = e.nativeEvent.composedPath()
        const mainTarget = path.find(p => p.dataset && p.dataset.contexttype)
        const contextType = mainTarget ? mainTarget.dataset.contexttype : 'NONE'

        if (contextType == 'MENU') return // if context menu is right-clicked, do nothing

        const clientX = e.clientX
        const clientY = e.clientY

        setContextMenu(contextType)
        setContextMenuPos({ x: clientX, y: clientY })
        setContextMenuData({ filedata, filename, filesize, mimeType, dimensions })
    }
    function handleContextMenuMessage(e, message, x, y) {
        e.preventDefault()
        const path = e.nativeEvent.composedPath()
        const mainTarget = path.find(p => p.dataset && p.dataset.contexttype)
        const contextType = mainTarget ? mainTarget.dataset.contexttype : 'NONE'

        // if context menu is right-clicked, do nothing. If file is right-clicked, let listener on the files container handle it
        if (contextType == 'MENU' || contextType == 'FILE') return


        setContextMenu(contextType)
        setContextMenuPos({ x, y })
        setContextMenuData({ id: message.id, target: mainTarget, setMessageEdit })
    }
    function handleContextMenuUser(e, user, x, y) {
        e.preventDefault()
        const path = e.nativeEvent.composedPath()
        const mainTarget = path.find(p => p.dataset && p.dataset.contexttype)
        const contextType = mainTarget ? mainTarget.dataset.contexttype : 'NONE'

        if (contextType == 'MENU') return

        setContextMenu(contextType)
        setContextMenuPos({ x, y })
        setContextMenuData({ user, target: mainTarget })
    }
    function handleMessageEdit(message) {
        const newText = messageEditDivRef.current.innerText.trim()
        setMessageEdit(false)
        if (newText.length > MAX_MESSAGE_LEN) return setNotificationState({ state: 'error', data: { message: `Message is too long. Max length is ${MAX_MESSAGE_LEN} characters.` } })
        else if (newText.length == 0) return setNotificationState({ state: 'error', data: { message: 'Message cannot be empty.' } })
        else if (message.message.content == newText) return
        else {
            socket.emit('messageEdit-server', { groupId: currentGroup.id, messageId: message.id, newMessage: newText, accessToken: jsCookie.get('accessToken') }, (res) => {
                if (!res) console.log('error, unable to edit message')
                setNotificationState({ state: 'warning', data: { message: 'Message Edited' } })
            })
        }
    }

    return (
        <div id={message.id} data-contexttype="MESSAGE" className={chatStyles.message} data-timestamp={message.createdAt} data-sender={message.author.uid == user.uid}
            onContextMenu={(e) => {
                const path = e.nativeEvent.composedPath()
                const mainTarget = path.find(p => p.dataset && p.dataset.contexttype)
                const contextType = mainTarget ? mainTarget.dataset.contexttype : 'NONE'

                const clientX = e.clientX
                const clientY = e.clientY

                if (contextType == 'MESSAGE') {
                    handleContextMenuMessage(e, message, clientX, clientY)
                }
                else if (contextType == 'USER') {
                    handleContextMenuUser(e, message.author, clientX, clientY)
                }
            }}
        >
            <img data-contexttype="USER" className={chatStyles.messageIcon} src={message.author.icon} loading={"lazy"} alt={`${message.author.username}'s icon`} />

            <div className={chatStyles.messageContainer}>
                <div className={chatStyles.messageHeader}>
                    <h4 className={chatStyles.messageAuthor} data-contexttype="USER">{message.author.username}</h4>
                    <div className={chatStyles.messageInfo}>
                        <div className={chatStyles.messageInfoSect}>
                            <span className={chatStyles.messageTS} title={moment(message.createdAt).format('llll')}>{
                                moment(Date.now()).diff(message.createdAt, 'months', true) > 1 ? moment(message.createdAt).format('l') : moment(message.createdAt).fromNow()
                            }</span>
                            <span className={chatStyles.messageEdited} title={"This message was edited."}>{message.edited ? '(edited)' : ''}</span>
                        </div>
                        <span className={chatStyles.messageOptions} data-contexttype={"MESSAGE"} data-type={'OPTIONS'}
                            onClick={(e) => {
                                const rect = e.target.getBoundingClientRect()
                                const clientX = rect.x - 8
                                const clientY = rect.y + rect.height / 2
                                handleContextMenuMessage(e, message, clientX, clientY)
                            }}
                        >more_horiz</span>
                    </div>
                </div>
                <div className={chatStyles.messageBody} >
                    <div className={chatStyles.messageContentContainer} >
                        {
                            !messageEdit ? (
                                <div className={chatStyles.messageContentMarkdown} data-message-content>{message.message.content}</div>
                            ) :
                                <div>
                                    <div className={chatStyles.messageContentEditable} contentEditable data-message-content ref={messageEditDivRef} suppressContentEditableWarning={true}
                                        data-length={messageEditLength}
                                        data-overflow={messageEditOverflow}
                                        // onInput={(e) => { // TODO: FIX THIS, UNABLE TO GET PROPER CARET POSITION WITH CONTENTEDITABLE BECAUSE MULTIPLE NODES CAN BE CREATED
                                        //     const caretPos = window.getSelection().anchorOffset
                                        //     const caretEl = window.getSelection().anchorNode

                                        //     // format text
                                        //     const text = e.target.innerText
                                        //     const formattedText = formatMessageInput(text, 100)
                                        //     e.target.innerHTML = formattedText
                                        //     // set cursor to last known position
                                        //     const range = document.createRange()
                                        //     const sel = window.getSelection()

                                        //     range.setStart(caretEl, caretPos)
                                        //     range.collapse(true)

                                        //     sel.removeAllRanges()
                                        //     sel.addRange(range)
                                        // }}

                                        onPaste={(e) => {
                                            e.preventDefault()
                                            const text = e.clipboardData.getData('text/plain')
                                            document.execCommand('insertText', false, text)
                                            e.target.scrollTop = e.target.scrollHeight * 1000
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key == 'Escape') {
                                                setMessageEdit(false)
                                            }
                                            else if (e.key == 'Enter' && !e.shiftKey) {
                                                e.preventDefault()
                                                handleMessageEdit(message)
                                            }
                                        }}
                                        onInput={(e) => {
                                            if (e.target.innerText.length > MAX_MESSAGE_LEN) {
                                                setMessageEditOverflow('error')
                                                setMessageEditLength(e.target.innerText.length)
                                            } else if (e.target.innerText.length > MAX_MESSAGE_LEN - 500) {
                                                setMessageEditOverflow('warn')
                                                setMessageEditLength(e.target.innerText.length)
                                            } else {
                                                setMessageEditOverflow(false)
                                                setMessageEditLength('')
                                            }
                                        }}
                                    >
                                        {message.message.content}
                                    </div>
                                    <div className={chatStyles.messageContentEditableInfo}>
                                        <div>
                                            <kbd onClick={() => {
                                                setMessageEdit(false)
                                            }}>
                                                esc
                                            </kbd>
                                            &nbsp;
                                            to cancel
                                            &nbsp;
                                        </div>
                                        &#8226;
                                        <div>
                                            &nbsp;
                                            <kbd onClick={(e) => {
                                                handleMessageEdit(message)
                                            }}>
                                                enter
                                            </kbd>
                                            &nbsp;
                                            to save
                                        </div>
                                    </div>
                                </div>
                        }
                    </div>
                    <div className={fileStyles.messageFiles}>
                        {
                            message.message.attachments.map((fileInfo, i) => {
                                const data = Buffer.isBuffer(fileInfo.data) ? fileInfo.data.toString('base64') : fileInfo.data
                                const fileSize = data ? calculateFileSize(data) : 0
                                const name = fileInfo.name

                                const mimeType = fileInfo.mimeType
                                const generalType = mimeType.split('/')[0]
                                const specificType = mimeType.split('/')[1]
                                switch (true) {
                                    case generalType === 'image' && specificType === 'apng':
                                    case generalType === 'image' && specificType === 'avif':
                                    case generalType === 'image' && specificType === 'jpeg':
                                    case generalType === 'image' && specificType === 'png':
                                    case generalType === 'image' && specificType === 'svg':
                                    case generalType === 'image' && specificType === 'webp':
                                    case generalType === 'image' && specificType === 'gif':
                                        return <ImageFileView
                                            key={`${i} ${data}`}
                                            alt={name}
                                            data={data}
                                            name={name}
                                            mimeType={mimeType}
                                            fileSize={fileSize}
                                            onContextMenu={(e, dimensions) => handleContextMenuFile(e, `data:${mimeType};base64,${data}`, name, fileSize, mimeType, dimensions)}
                                        />
                                    case generalType === 'audio' && specificType === 'ogg':
                                    case generalType === 'audio' && specificType === 'mp3':
                                    case generalType === 'audio' && specificType === 'wav':
                                    case generalType === 'audio' && specificType === 'mpeg':
                                        return <AudioFileView
                                            key={`${i} ${data}`}
                                            mimeType={mimeType}
                                            name={name}
                                            fileSize={fileSize}
                                            data={`data:${mimeType};base64,${data}`}
                                            onContextMenu={(e) => handleContextMenuFile(e, `data:${mimeType};base64,${data}`, name, fileSize, mimeType)}
                                        />
                                    case generalType === 'video' && specificType === 'ogg':
                                    case generalType === 'video' && specificType === 'mp4':
                                    case generalType === 'video' && specificType === 'webm':
                                        // find aspect ratio of video here and add it to the contextmenu listener below
                                        return <VideoFileView
                                            key={`${i} ${data}`}
                                            name={name}
                                            mimeType={mimeType}
                                            fileSize={fileSize}
                                            data={`data:${mimeType};base64,${data}`}
                                            onContextMenu={(e, dimensions) => handleContextMenuFile(e, `data:${mimeType};base64,${data}`, name, fileSize, mimeType, dimensions)}
                                        />
                                    case generalType === 'text':
                                        return <TextFileView
                                            key={`${i} ${data}`}
                                            data={data}
                                            fileSize={fileSize}
                                            mimeType={mimeType}
                                            name={name}
                                            onContextMenu={(e) => handleContextMenuFile(e, `data:${mimeType};base64,${data}`, name, fileSize, mimeType)}
                                        />
                                    default:
                                        return <DefaultFileView
                                            key={`${i} ${data}`}
                                            mimeType={mimeType}
                                            name={name}
                                            fileSize={fileSize}
                                            data={`data:${mimeType};base64,${data}`}
                                            onContextMenu={(e) => handleContextMenuFile(e, `data:${mimeType};base64,${data}`, name, fileSize, mimeType)}
                                        />
                                }
                            })
                        }
                    </div>
                </div>
            </div>
        </div>
    )
}