export function PageLoading() {
    return (
        <div style={{ width: '100%', height: '90%', display: "flex", justifyContent: "center", alignItems: "center", position: 'absolute' }}>
            <Spinner color={SPINNER_COLOR} height={'80px'} width={'80px'} thickness={'8px'} animationDuration={'1s'} animationTimingFunction={'cubic-bezier(0.62, 0.27, 0.08, 0.96)'} />
        </div>
    )
}