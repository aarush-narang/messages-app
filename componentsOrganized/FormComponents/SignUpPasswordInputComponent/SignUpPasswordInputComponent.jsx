export function SignUpPasswordInput({ name, onInput, onSubmit, minWidth, width, maxWidth, minHeight, height, maxHeight, ...props }) {
    const [passView, setPassView] = useState(false);
    const [confirmPassView, setConfirmPassView] = useState(false);
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
        <>
            <div>
                <input className={formStyles.input} onInput={onInput} onSubmit={onSubmit} style={passStyles} type={passView ? 'text' : 'password'} placeholder="Password" name={name} />
                <a className={formStyles.pass_view} onClick={() => setPassView(!passView)}>{passView ? 'Hide' : 'View'}</a>
            </div>
            <div>
                <input className={formStyles.input} style={passStyles} type={confirmPassView ? 'text' : 'password'} placeholder="Confirm Password" name={"confirm_" + name} />
                <a className={formStyles.pass_view} onClick={() => setConfirmPassView(!confirmPassView)}>{confirmPassView ? 'Hide' : 'View'}</a>
            </div>
        </>
    )
}