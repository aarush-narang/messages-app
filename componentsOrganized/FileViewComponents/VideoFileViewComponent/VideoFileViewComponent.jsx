export function VideoFileViewComponent({ data, name, mimeType, fileSize, onContextMenu }) {
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