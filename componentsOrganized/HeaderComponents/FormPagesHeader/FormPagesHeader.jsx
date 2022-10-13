export function FormPagesHeader() {
    return (
        <div className={headerStyles.formHeaderContainer}>
            <div className={headerStyles.headerButtons}>
                <button onClick={() => window.location = "/"} className={headerStyles.headerButton}>
                    <a>Return To Home</a>
                </button>
            </div>
        </div>
    )
}