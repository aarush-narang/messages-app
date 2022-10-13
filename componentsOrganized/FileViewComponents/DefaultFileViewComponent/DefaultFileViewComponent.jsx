export function DefaultFileView({ data, name, mimeType, fileSize, onContextMenu }) {
    return (
        <div className={fileStyles.messageFile} onContextMenu={onContextMenu}>
            <div data-contexttype="FILE" className={fileStyles.fileViewContainer}>
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
        </div>

    )
}