export function FileContextMenuComponent({ group, user, data, setNotificationState }) {
    const fileData = data.filedata
    const fileName = data.filename
    const fileSize = data.filesize
    const fileMimeType = data.mimeType
    const fileDimensions = data.dimensions
    let fileAspectRatio = null
    const generalType = fileMimeType.split('/')[0]

    // calculate aspect ratio with gcd
    if (fileDimensions) {
        const r = gcd(fileDimensions.width, fileDimensions.height)
        fileAspectRatio = `${fileDimensions.width / r}:${fileDimensions.height / r}`
    }

    return (
        <ul className={contextMenuStyles.contextMenuContainer}>
            <li className={contextMenuStyles.contextMenuFileInfo} data-contexttype={'OPTIONS'}>
                <div title={`File Name: ${fileName}`}>{fileName}</div>
                <div className={contextMenuStyles.contextMenuItemText}>
                    <div title={`File Size: ${fileSize}`}>{fileSize}</div>
                    <div title={`File Type: ${fileMimeType}`}>{fileMimeType}</div>
                </div>
                {
                    fileAspectRatio ?
                        <div className={contextMenuStyles.contextMenuItemText}>
                            <div title={`Intrinsic Aspect Ratio: ${fileAspectRatio}`}>{fileAspectRatio}</div>
                            <div title={`Intrinsic Dimensions: ${fileDimensions.width}x${fileDimensions.height}`}>{`${fileDimensions.width}x${fileDimensions.height}`}</div>
                        </div>
                        : null
                }
            </li>
            <li className={contextMenuStyles.contextMenuItem}
                onClick={() => {
                    downloadBase64File(fileData, fileName)
                    setNotificationState({ state: 'success', data: { message: 'Downloaded File' } })
                }}
            >
                <div className={contextMenuStyles.contextMenuItemText}>Download {
                    generalType == 'image' ? 'Image' : generalType == 'video' ? 'Video' : generalType == 'audio' ? 'Audio' : 'File'
                }</div>
                <div className={contextMenuStyles.contextMenuItemIcon} >file_download</div>
            </li>
            <li className={contextMenuStyles.contextMenuItem}
                onClick={() => {
                    const w = window.open('about:blank');

                    setTimeout(function () { //FireFox seems to require a setTimeout for this to work.
                        const body = w.document.body;
                        if (generalType == 'audio') {
                            const audio = document.createElement('audio');
                            audio.src = fileData;
                            audio.controls = true;
                            body.appendChild(audio);
                        } else if (generalType == 'video') {
                            const video = document.createElement('video');
                            video.src = fileData;
                            video.controls = true;
                            body.appendChild(video);
                        } else if (generalType == 'image') {
                            const img = document.createElement('img');
                            img.src = fileData;
                            img.style.maxWidth = '100%';
                            img.style.maxHeight = '100%';
                            body.appendChild(img);
                        } else {
                            const iframe = document.createElement('iframe');
                            iframe.src = fileData
                            body.appendChild(iframe);
                            iframe.style.width = '100%'
                            iframe.style.height = '100%'
                            iframe.style.padding = '0'
                            iframe.style.margin = '0'
                            iframe.style.border = 'none'
                        }
                        body.style.display = 'flex';
                        body.style.alignItems = 'center';
                        body.style.justifyContent = 'center';
                        body.style.backgroundColor = 'black'
                        body.style.width = '100%'
                        body.style.height = '100%'
                        body.style.border = 'none'
                        body.style.padding = '0'
                        body.style.margin = '0'
                    }, 0);
                }}
            >
                <div className={contextMenuStyles.contextMenuItemText}>Open In New Tab</div>
                <div className={contextMenuStyles.contextMenuItemIcon} >open_in_new</div>
            </li>
        </ul>
    )
}