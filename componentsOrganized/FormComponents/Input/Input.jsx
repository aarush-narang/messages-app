export function Input({ placeholder, onInput, name, minWidth, width, maxWidth, minHeight, height, maxHeight, type, ...props }) {
    const inputStyles = {
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
            <input
                className={formStyles.input}
                type={type || 'text'}
                placeholder={placeholder}
                autoComplete="false"
                autoCapitalize="false"
                autoCorrect="false"
                style={inputStyles}
                onInput={onInput}
                name={name}
            />
        </div>
    )
}