export function PasswordInput({ name, minWidth, width, maxWidth, minHeight, height, maxHeight, ...props }) {
    const [passView, setPassView] = useState(false);
    const passStyles = {
        minWidth,
        width,
        maxWidth,
        minHeight,
        height,
        maxHeight,
        ...props,
    }
    return (
        <div>
            <input className={formStyles.input} style={passStyles} type={passView ? 'text' : 'password'} placeholder="Password" name={name} />
            <a className={formStyles.pass_view} onClick={() => setPassView(!passView)}>{passView ? 'Hide' : 'View'}</a>
        </div>
    )
}