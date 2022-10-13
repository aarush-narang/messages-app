export function Spinner({ width, height, thickness, color, animationDuration = '.85s', animationTimingFunction = 'cubic-bezier(0.14, 0.28, 0.29, 0.87)' }) {
    return (
        <div className={formStyles.spinner} style={{ width, height, borderWidth: thickness, borderColor: color, borderRightColor: 'transparent', animationDuration, animationTimingFunction }}></div>
    )
}