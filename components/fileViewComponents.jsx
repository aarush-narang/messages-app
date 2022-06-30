import videoStyles from "../styles/FileViews/VideoOverlay.module.css";
import audioStyles from "../styles/FileViews/AudioOverlay.module.css";
import fileStyles from "../styles/FileViews/FileViews.module.css";
import { useState, useEffect, useRef } from "react";
import { shortenFileName, downloadBase64File, formatDuration } from "./util";
const MAX_FILE_NAME_LEN = 100
const EXTENSIONS = [
    'apng',
    'avif',
    'jpeg',
    'png',
    'svg',
    'webp',
    'gif',
    'ogg',
    'mp3',
    'wav',
    'mpeg',
    'mp4',
    'webm',
    'pdf',
    'doc',
    'docx',
    'xls',
    'xlsx',
    'ppt',
    'pptx',
    'text',
    'rtf',
    'csv',
    'zip',
    'rar',
    '7z',
]
// Message File Views
export function TextFileView({ name, mimeType, data, fileSize, onContextMenu }) {
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
export function VideoFileView({ data, name, mimeType, fileSize, onContextMenu }) {
    const PLAYBACK_SPEEDS = ['0.25', '0.5', '0.75', '1', '1.25', '1.5', '1.75', '2']
    const [playing, _setPlaying] = useState(false) // true = playing, false = paused
    const [fullscreen, _setFullscreen] = useState(false) // true = fullscreen, false = not fullscreen
    const [volume, _setVolume] = useState(1) // 0 to 1
    const [muted, _setMuted] = useState(true)
    const [playbackSpeed, _setPlaybackSpeed] = useState('1')
    const [currentTime, _setCurrentTime] = useState(0) // in seconds
    const [currentTimeInternal, _setCurrentTimeInternal] = useState(0) // in seconds
    const [duration, _setDuration] = useState(0) // in seconds
    const [pbSpeedMenuState, setPbSpeedMenuState] = useState(false)
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

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

    const videoRef = useRef(null)
    const videoContainerRef = useRef(null)
    const pbSpeedElementRef = useRef(null)

    useEffect(async () => {
        playing ? await videoRef.current.play() : await videoRef.current.pause()
    }, [playing])
    useEffect(() => {
        if (document.fullscreenElement == null && fullscreenRef.current) {
            videoContainerRef.current.requestFullscreen()
        } else if (document.fullscreenElement) {
            document.exitFullscreen()
            setFullscreen(false)
        }

        return () => {
            if (document.fullscreenElement) {
                document.exitFullscreen()
                setFullscreen(false)
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
        const video = document.createElement('video')
        video.src = data
        video.onloadedmetadata = () => {
            setDimensions({ width: video.videoWidth, height: video.videoHeight })
        }

        function handleClickEvent(e) {
            if (!e.composedPath().includes(pbSpeedElementRef.current)) {
                setPbSpeedMenuState(false)
            }
        }

        document.addEventListener('click', handleClickEvent)

        return () => { // cleanup event listeners
            document.removeEventListener('click', handleClickEvent)
        }
    }, [])
    return (
        <div data-contexttype="FILE" className={videoStyles.videoContainer} data-playing={playing} data-fullscreen={fullscreen} ref={videoContainerRef}
            onContextMenu={(e) => {
                onContextMenu(e, dimensions)
            }}
        >
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
export function AudioFileView({ data, name, mimeType, fileSize, onContextMenu }) {
    const PLAYBACK_SPEEDS = ['0.25', '0.5', '0.75', '1', '1.25', '1.5', '1.75', '2']
    const [playing, _setPlaying] = useState(false) // true = playing, false = paused
    const [volume, _setVolume] = useState(1) // 0 - 1
    const [muted, _setMuted] = useState(true)
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
        function handleClickEvent(e) {
            if (!e.composedPath().includes(pbSpeedElementRef.current)) {
                setPbSpeedMenuState(false)
            }
        }
        document.addEventListener('click', handleClickEvent)

        return () => { // cleanup event listener
            document.removeEventListener('click', handleClickEvent)
        }
    }, [])

    // controls: play/pause, duration and current time, timeline, volume/mute, playback speed, download
    return (
        <div data-contexttype="FILE" className={audioStyles.audioContainer} data-playing={playing} ref={audioContainerRef} onContextMenu={onContextMenu}>
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
export function ImageFileView({ data, name, mimeType, fileSize, onContextMenu }) {
    const MAX_DIMENSION = 300
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
    const [intrinsicDimensions, setIntrinsicDimensions] = useState({ width: 0, height: 0 })

    useEffect(() => {
        const img = new Image()
        img.src = `data:${mimeType};base64,${data}`
        img.onload = () => {
            if (img.width > MAX_DIMENSION) {
                setDimensions({
                    width: MAX_DIMENSION,
                    height: Math.floor(img.height * (MAX_DIMENSION / img.width))
                })
            } else if (img.height > MAX_DIMENSION) {
                setDimensions({
                    width: Math.floor(img.width * (MAX_DIMENSION / img.height)),
                    height: MAX_DIMENSION
                })
            } else {
                setDimensions({ width: img.width, height: img.height })
            }
            setIntrinsicDimensions({ width: img.width, height: img.height })
        }
    }, [])

    return <img
        data-contexttype="FILE"
        className={fileStyles.messageFile}
        alt={name}
        src={`data:${mimeType};base64,${data}`}
        title={name}
        onContextMenu={(e) => { onContextMenu(e, intrinsicDimensions) }}
        width={dimensions.width}
        height={dimensions.height}
    />
}
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
export function AttachedFileView({ id, data, name, mimeType, fileSize, onContextMenu, attachedFiles, setAttachedFiles, setNotificationState }) {
    const generalType = mimeType.split('/')[0]
    const specificType = mimeType.split('/')[1]

    const [editState, setEditState] = useState(false)

    return (
        <div data-contexttype="FILE" className={fileStyles.attachedFileViewContainer} onContextMenu={onContextMenu}>
            <div className={fileStyles.attachmentButtons}>
                <div className={`${fileStyles.editAttachmentButton} ${fileStyles.attachmentButton}`}
                    onClick={(e) => {
                        setEditState(!editState)
                    }}
                >edit</div>
                <div className={`${fileStyles.removeAttachmentButton} ${fileStyles.attachmentButton}`}
                    onClick={() => {
                        setAttachedFiles(attachedFiles.filter(file => file.name != name))
                        setNotificationState({ state: 'success', data: { message: `File "${shortenFileName(name, 15)}" removed!` } })
                    }}
                >delete</div>
            </div>
            <div className={fileStyles.attachedFile}>
                {
                    generalType == 'image' ?
                        <img
                            className={fileStyles.attachedImage}
                            alt={name}
                            src={data}
                            title={name}
                        /> :
                        <div className={fileStyles.fileIcon}>
                            {
                                generalType == 'audio' ?
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" height="96" viewBox="0 0 72 96" width="72"><path d="m72 29.3v60.3c0 2.24 0 3.36-.44 4.22-.38.74-1 1.36-1.74 1.74-.86.44-1.98.44-4.22.44h-59.2c-2.24 0-3.36 0-4.22-.44-.74-.38-1.36-1-1.74-1.74-.44-.86-.44-1.98-.44-4.22v-83.2c0-2.24 0-3.36.44-4.22.38-.74 1-1.36 1.74-1.74.86-.44 1.98-.44 4.22-.44h36.3c1.96 0 2.94 0 3.86.22.5.12.98.28 1.44.5v16.88c0 2.24 0 3.36.44 4.22.38.74 1 1.36 1.74 1.74.86.44 1.98.44 4.22.44h16.88c.22.46.38.94.5 1.44.22.92.22 1.9.22 3.86z" fill="#d3d6fd" /><path d="m68.26 20.26c1.38 1.38 2.06 2.06 2.56 2.88.18.28.32.56.46.86h-16.88c-2.24 0-3.36 0-4.22-.44-.74-.38-1.36-1-1.74-1.74-.44-.86-.44-1.98-.44-4.22v-16.880029c.3.14.58.28.86.459999.82.5 1.5 1.18 2.88 2.56z" fill="#939bf9" /><path clipRule="evenodd" d="m34.76 42.16c-.74-.3-1.6-.14-2.18.44l-8.58 9.4h-6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h6l8.58 9.42c.58.58 1.44.74 2.18.44.76-.32 1.24-1.06 1.24-1.86v-32c0-.8-.48-1.54-1.24-1.84zm5.24 3.84v4c5.52 0 10 4.48 10 10s-4.48 10-10 10v4c7.72 0 14-6.28 14-14s-6.28-14-14-14zm0 8c3.3 0 6 2.7 6 6s-2.7 6-6 6v-4c1.1 0 2-.9 2-2s-.9-2-2-2z" fill="#5865f2" fillRule="evenodd" /></svg>
                                    :
                                    generalType == 'video' ?
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" height="96" viewBox="0 0 72 96" width="72"><path d="m72 29.3v60.3c0 2.24 0 3.36-.44 4.22-.38.74-1 1.36-1.74 1.74-.86.44-1.98.44-4.22.44h-59.2c-2.24 0-3.36 0-4.22-.44-.74-.38-1.36-1-1.74-1.74-.44-.86-.44-1.98-.44-4.22v-83.2c0-2.24 0-3.36.44-4.22.38-.74 1-1.36 1.74-1.74.86-.44 1.98-.44 4.22-.44h36.3c1.96 0 2.94 0 3.86.22.5.12.98.28 1.44.5v16.88c0 2.24 0 3.36.44 4.22.38.74 1 1.36 1.74 1.74.86.44 1.98.44 4.22.44h16.88c.22.46.38.94.5 1.44.22.92.22 1.9.22 3.86z" fill="#d3d6fd" /><path d="m68.26 20.26c1.38 1.38 2.06 2.06 2.56 2.88.18.28.32.56.46.86h-16.88c-2.24 0-3.36 0-4.22-.44-.74-.38-1.36-1-1.74-1.74-.44-.86-.44-1.98-.44-4.22v-16.880029c.3.14.58.28.86.459999.82.5 1.5 1.18 2.88 2.56z" fill="#939bf9" /><g fill="#5865f2"><path clipRule="evenodd" d="m16 0h-8v8h8zm0 16h-8v8h8zm-8 16h8v8h-8zm56 0h-8v8h8zm-56 16h8v8h-8zm56 0h-8v8h8zm-56 16h8v8h-8zm56 0h-8v8h8zm-56 16h8v8h-8zm56 0h-8v8h8z" fillRule="evenodd" /><path d="m30 50.98v18l15-9z" /></g></svg>
                                        :
                                        specificType == 'pdf' ?
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" height="96" viewBox="0 0 72 96" width="72"><path d="m72 29.3v60.3c0 2.24 0 3.36-.44 4.22-.38.74-1 1.36-1.74 1.74-.86.44-1.98.44-4.22.44h-59.2c-2.24 0-3.36 0-4.22-.44-.74-.38-1.36-1-1.74-1.74-.44-.86-.44-1.98-.44-4.22v-83.2c0-2.24 0-3.36.44-4.22.38-.74 1-1.36 1.74-1.74.86-.44 1.98-.44 4.22-.44h36.3c1.96 0 2.94 0 3.86.22.5.12.98.28 1.44.5v16.88c0 2.24 0 3.36.44 4.22.38.74 1 1.36 1.74 1.74.86.44 1.98.44 4.22.44h16.88c.22.46.38.94.5 1.44.22.92.22 1.9.22 3.86z" fill="#d3d6fd" /><path d="m68.26 20.26c1.38 1.38 2.06 2.06 2.56 2.88.18.28.32.56.46.86h-16.88c-2.24 0-3.36 0-4.22-.44-.74-.38-1.36-1-1.74-1.74-.44-.86-.44-1.98-.44-4.22v-16.880029c.3.14.58.28.86.459999.82.5 1.5 1.18 2.88 2.56z" fill="#939bf9" /><path d="m56.1014 65.0909c-3.1394-3.2-11.7-1.8909-13.7625-1.6545-2.2633-2.2182-4.1981-4.7273-5.7861-7.4546 1.1317-3.1636 1.7705-6.4727 1.9348-9.8182 0-2.9636-1.2047-6.1636-4.5815-6.1636-1.1864.0364-2.2815.6545-2.9021 1.6545-1.442 2.491-.8397 7.4546 1.4419 12.5455-1.5697 4.6545-3.5592 9.1636-5.9138 13.4909-3.5046 1.4182-10.8604 4.7273-11.4627 8.2909-.2373 1.0909.146 2.2.9674 2.9637.8578.6909 1.9165 1.0545 3.0299 1.0545 4.4719 0 8.8161-6.0364 11.8278-11.1273 3.4315-1.1454 6.936-2.0545 10.4952-2.7272 4.7092 4.0181 8.8161 4.6181 10.9882 4.6181 2.9021 0 3.9791-1.1818 4.3441-2.2545.5293-1.1455.2921-2.5091-.6206-3.4182zm-3.0117 2.0182c-.1277.8364-1.2047 1.6545-3.1394 1.1818-2.2451-.5818-4.3442-1.6364-6.1512-3.0727 1.5697-.2364 5.0743-.6 7.5931-.1273.9674.2364 1.9348.8182 1.6975 2.0182zm-20.1509-24.3818c.2007-.3455.5658-.5637.9673-.6 1.077 0 1.3325 1.3091 1.3325 2.3636-.1278 2.5091-.6023 4.9636-1.442 7.3455-1.8252-4.7273-1.4602-8.0546-.8578-9.1091zm-.2373 22.9454c1.0404-2.1636 1.9713-4.3636 2.7744-6.6182 1.1134 1.7455 2.4093 3.3637 3.8695 4.8546-.0182.1091-3.76.8182-6.6439 1.7636zm-7.1186 4.7455c-2.7744 4.4909-5.6766 7.3454-7.2463 7.3454-.2555-.0181-.5111-.1091-.7301-.2363-.3651-.2364-.5111-.6728-.3651-1.0728.3651-1.6545 3.5046-3.909 8.3415-6.0363z" fill="#5865f2" /></svg>
                                            :
                                            specificType == 'css' || specificType == 'html' || specificType == 'xml' ?
                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" height="96" viewBox="0 0 72 96" width="72"><path d="m72 29.3v60.3c0 2.24 0 3.36-.44 4.22-.38.74-1 1.36-1.74 1.74-.86.44-1.98.44-4.22.44h-59.2c-2.24 0-3.36 0-4.22-.44-.74-.38-1.36-1-1.74-1.74-.44-.86-.44-1.98-.44-4.22v-83.2c0-2.24 0-3.36.44-4.22.38-.74 1-1.36 1.74-1.74.86-.44 1.98-.44 4.22-.44h36.3c1.96 0 2.94 0 3.86.22.5.12.98.28 1.44.5v16.88c0 2.24 0 3.36.44 4.22.38.74 1 1.36 1.74 1.74.86.44 1.98.44 4.22.44h16.88c.22.46.38.94.5 1.44.22.92.22 1.9.22 3.86z" fill="#d3d6fd" /><path d="m68.26 20.26c1.38 1.38 2.06 2.06 2.56 2.88.18.28.32.56.46.86h-16.88c-2.24 0-3.36 0-4.22-.44-.74-.38-1.36-1-1.74-1.74-.44-.86-.44-1.98-.44-4.22v-16.880029c.3.14.58.28.86.459999.82.5 1.5 1.18 2.88 2.56z" fill="#939bf9" /><path clipRule="evenodd" d="m25.56 80h4.32l16.56-40h-4.32zm1.1-12-8-8 8-8h-5.66l-8 8 8 8zm26.68-8-8 8h5.66l8-8-8-8h-5.66z" fill="#5865f2" fillRule="evenodd" /></svg>
                                                :
                                                specificType == 'js' || specificType == 'json' || specificType == 'ts' || specificType == 'tsx' || specificType == 'jsx' || specificType == 'x-python' ?
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" height="96" viewBox="0 0 72 96" width="72"><path d="m72 29.3v60.3c0 2.24 0 3.36-.44 4.22-.38.74-1 1.36-1.74 1.74-.86.44-1.98.44-4.22.44h-59.2c-2.24 0-3.36 0-4.22-.44-.74-.38-1.36-1-1.74-1.74-.44-.86-.44-1.98-.44-4.22v-83.2c0-2.24 0-3.36.44-4.22.38-.74 1-1.36 1.74-1.74.86-.44 1.98-.44 4.22-.44h36.3c1.96 0 2.94 0 3.86.22.5.12.98.28 1.44.5v16.88c0 2.24 0 3.36.44 4.22.38.74 1 1.36 1.74 1.74.86.44 1.98.44 4.22.44h16.88c.22.46.38.94.5 1.44.22.92.22 1.9.22 3.86z" fill="#d3d6fd" /><path d="m68.26 20.26c1.38 1.38 2.06 2.06 2.56 2.88.18.28.32.56.46.86h-16.88c-2.24 0-3.36 0-4.22-.44-.74-.38-1.36-1-1.74-1.74-.44-.86-.44-1.98-.44-4.22v-16.880029c.3.14.58.28.86.459999.82.5 1.5 1.18 2.88 2.56z" fill="#939bf9" /><path clipRule="evenodd" d="m23.7 40.46c.66-.28 1.32-.38 1.98-.42.62-.04 1.38-.04 2.26-.04h.06v4c-.96 0-1.58 0-2.04.02-.46.04-.64.08-.72.12-.48.2-.88.6-1.08 1.08-.04.1-.08.26-.12.72-.04.48-.04 1.1-.04 2.06v6.06c0 .88 0 1.64-.04 2.26-.06.66-.14 1.32-.42 1.98-.26.64-.64 1.2-1.1 1.7.46.5.84 1.06 1.1 1.7.28.66.38 1.32.42 1.98.04.62.04 1.38.04 2.26v6.06c0 .96 0 1.58.02 2.04.04.46.08.64.12.72.2.48.6.88 1.08 1.08.1.04.26.08.72.12.48.04 1.1.04 2.06.04v4h-.06c-.88 0-1.64 0-2.26-.04-.66-.06-1.32-.14-1.98-.42-1.46-.6-2.64-1.76-3.24-3.24-.28-.66-.38-1.32-.42-1.98-.04-.62-.04-1.38-.04-2.26v-6.06c0-.96 0-1.58-.02-2.04-.04-.46-.08-.64-.12-.72-.2-.48-.6-.88-1.08-1.08-.1-.04-.26-.08-.72-.12-.48-.04-1.1-.04-2.06-.04v-4c.96 0 1.58 0 2.04-.02.46-.04.64-.08.72-.12.48-.2.88-.58 1.08-1.08.04-.1.08-.26.12-.72.04-.48.04-1.1.04-2.06v-6.06c0-.88 0-1.64.04-2.26.06-.66.14-1.32.42-1.98.6-1.46 1.76-2.64 3.24-3.24zm29.52 17.38c.1.04.26.08.72.12.48.04 1.1.04 2.06.04v4c-.96 0-1.58 0-2.04.02-.46.04-.64.08-.72.12-.48.2-.88.6-1.08 1.08-.04.1-.08.26-.12.72-.04.48-.04 1.1-.04 2.06v6.06c0 .88 0 1.64-.04 2.26-.06.66-.14 1.32-.42 1.98-.6 1.46-1.78 2.64-3.24 3.24-.66.28-1.32.38-1.98.42-.62.04-1.38.04-2.26.04h-.06v-4c.96 0 1.58 0 2.04-.02.46-.04.64-.08.72-.12.48-.2.88-.58 1.08-1.08.04-.1.08-.26.12-.72.04-.48.04-1.1.04-2.06v-6.06c0-.88 0-1.64.04-2.26.06-.66.16-1.32.42-1.98.26-.64.64-1.2 1.1-1.7-.46-.5-.84-1.06-1.1-1.7-.28-.66-.38-1.32-.42-1.98-.04-.62-.04-1.38-.04-2.26v-6.06c0-.96 0-1.58-.02-2.04-.04-.46-.08-.64-.12-.72-.2-.48-.6-.88-1.08-1.08-.1-.04-.26-.08-.72-.12-.48-.04-1.1-.04-2.06-.04v-4h.06c.88 0 1.64 0 2.26.04.66.06 1.32.14 1.98.42 1.46.6 2.64 1.76 3.24 3.24.28.66.38 1.32.42 1.98.04.62.04 1.38.04 2.26v6.06c0 .96 0 1.58.02 2.04.04.46.08.64.12.72.2.48.6.88 1.08 1.08z" fill="#5865f2" fillRule="evenodd" /></svg>
                                                    :
                                                    generalType == 'text' ?
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" height="96" viewBox="0 0 72 96" width="72"><path d="m72 29.3v60.3c0 2.24 0 3.36-.44 4.22-.38.74-1 1.36-1.74 1.74-.86.44-1.98.44-4.22.44h-59.2c-2.24 0-3.36 0-4.22-.44-.74-.38-1.36-1-1.74-1.74-.44-.86-.44-1.98-.44-4.22v-83.2c0-2.24 0-3.36.44-4.22.38-.74 1-1.36 1.74-1.74.86-.44 1.98-.44 4.22-.44h36.3c1.96 0 2.94 0 3.86.22.5.12.98.28 1.44.5v16.88c0 2.24 0 3.36.44 4.22.38.74 1 1.36 1.74 1.74.86.44 1.98.44 4.22.44h16.88c.22.46.38.94.5 1.44.22.92.22 1.9.22 3.86z" fill="#d3d6fd" /><path d="m68.26 20.26c1.38 1.38 2.06 2.06 2.56 2.88.18.28.32.56.46.86h-16.88c-2.24 0-3.36 0-4.22-.44-.74-.38-1.36-1-1.74-1.74-.44-.86-.44-1.98-.44-4.22v-16.880029c.3.14.58.28.86.459999.82.5 1.5 1.18 2.88 2.56z" fill="#939bf9" /><path clipRule="evenodd" d="m56 40h-16v4h16zm0 12h-16v4h16zm-40 12h40v4h-40zm40 12h-40v4h40zm-30-20h-4v-12h-6v-4h16v4h-6z" fill="#5865f2" fillRule="evenodd" /></svg>
                                                        :
                                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" height="96" viewBox="0 0 72 96" width="72"><path d="m72 29.3v60.3c0 2.24 0 3.36-.44 4.22-.38.74-1 1.36-1.74 1.74-.86.44-1.98.44-4.22.44h-59.2c-2.24 0-3.36 0-4.22-.44-.74-.38-1.36-1-1.74-1.74-.44-.86-.44-1.98-.44-4.22v-83.2c0-2.24 0-3.36.44-4.22.38-.74 1-1.36 1.74-1.74.86-.44 1.98-.44 4.22-.44h36.3c1.96 0 2.94 0 3.86.22.5.12.98.28 1.44.5v16.88c0 2.24 0 3.36.44 4.22.38.74 1 1.36 1.74 1.74.86.44 1.98.44 4.22.44h16.88c.22.46.38.94.5 1.44.22.92.22 1.9.22 3.86z" fill="#d3d6fd" /><path d="m68.26 20.26c1.38 1.38 2.06 2.06 2.56 2.88.18.28.32.56.46.86h-16.88c-2.24 0-3.36 0-4.22-.44-.74-.38-1.36-1-1.74-1.74-.44-.86-.44-1.98-.44-4.22v-16.880029c.3.14.58.28.86.459999.82.5 1.5 1.18 2.88 2.56z" fill="#939bf9" /></svg>
                            }
                        </div>
                }
            </div>
            {
                editState ?
                    <form action="" className={fileStyles.editAttachmentFormContainer}
                        onSubmit={(e) => {
                            e.preventDefault()
                            const formData = new FormData(e.target)
                            let newName = formData.get('new_attachment_name')

                            if (newName.split('.').pop() !== specificType && EXTENSIONS.includes(specificType)) {
                                newName = newName + '.' + specificType
                            } else if (newName === '' || newName === name) {
                                return setEditState(false)
                            }
                            setAttachedFiles(attachedFiles.map(file => {
                                if (file.id === id) {
                                    file.name = newName
                                }
                                return file
                            }))
                            return setEditState(false)
                        }}>
                        <input
                            type="text"
                            name="new_attachment_name"
                            className={fileStyles.editAttachmentInput}
                            defaultValue={name}
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="none"
                            spellCheck="false"
                            onInput={(e) => {
                                e.preventDefault()
                                if (e.target.value.length > MAX_FILE_NAME_LEN) {
                                    e.target.value = e.target.value.slice(0, MAX_FILE_NAME_LEN)
                                    setNotificationState({ state: 'warning', data: { message: 'Your file name is too long!' } })
                                    return false
                                }
                            }}
                        />
                        <button type="submit" className={fileStyles.editAttachmentSubmit}>check_circle</button>
                    </form>
                    :
                    <div className={fileStyles.attachedFileName}>
                        {shortenFileName(name, 30)}
                    </div>
            }
        </div>
    )
}
