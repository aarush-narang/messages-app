export function ErrorMessage({ error, ...props }) {
    const errorStyles = {
        ...props,
    }

    return (
        <p className={formStyles.error} style={errorStyles}>{error}</p>
    )
}