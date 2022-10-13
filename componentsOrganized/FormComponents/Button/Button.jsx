export function Button({ loading, loadingColor, type, name, innerText, className, minWidth, width, maxWidth, minHeight, height, maxHeight, ...props }) {
    const submitStyles = {
        minWidth,
        width,
        maxWidth,
        minHeight,
        height,
        maxHeight,
    }
    return (
        <button className={className} style={submitStyles} type={type ? type : "submit"} disabled={loading} name={name} onClick={props.onClick}>{
            loading ?
                <Spinner height={'1.75em'} width={'1.75em'} thickness={'3px'} color={loadingColor ? loadingColor : 'var(--color-correct-dark)'} />
                :
                <a>{innerText}</a>
        }</button>
    )
}