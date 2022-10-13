export function Option({ text, icon, data, selectedItems, setSelectedItems }) {
    const [checkboxState, setCheckboxState] = useState(false);

    useEffect(() => {
        if (selectedItems.find(item => item.text === text)) {
            setCheckboxState(true);
        } else {
            setCheckboxState(false);
        }
    }, [selectedItems])

    return (
        <div className={formStyles.optionContainer}>
            <div className={formStyles.optionInfo}>
                {
                    icon
                        ?
                        <div>
                            <img className={formStyles.optionIcon} src={icon} alt={text} />
                        </div>
                        : null
                }
                <div className={formStyles.optionText}>{text}</div>
            </div>
            <div>
                <input className={formStyles.optionCheck} type="checkbox" checked={checkboxState}
                    onChange={(e) => {
                        setCheckboxState(e.target.checked);

                        if (e.target.checked) {
                            setSelectedItems([...selectedItems, { text, icon, data }])
                        } else {
                            setSelectedItems(selectedItems.filter(item => item.text !== text))
                        }
                    }}
                />
                <div className={formStyles.customCheckboxContainer}>
                    <div className={formStyles.customCheckboxIcon}>
                        {
                            checkboxState ?
                                'done'
                                :
                                <>&#8203;</>
                        }
                    </div>
                </div>
            </div>
        </div>
    )
}