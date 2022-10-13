export function TextFileViewComponent({ name, mimeType, data, fileSize, onContextMenu }) {
    const [textFileState, setTextFileState] = useState(false)

    return (
        <pre data-contexttype="FILE" key={data} wrap={"true"} className={fileStyles.messageFile} onContextMenu={onContextMenu}>
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