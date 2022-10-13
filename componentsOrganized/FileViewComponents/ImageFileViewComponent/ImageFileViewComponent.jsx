export function ImageFileViewComponent({ data, name, mimeType, fileSize, onContextMenu }) {
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