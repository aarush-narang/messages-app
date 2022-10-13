export function MultiSelect({ options, onChange, ref }) {
    const [selectedItems, setSelectedItems] = useState([]);
    const queryFilterRef = useRef(null);

    useEffect(() => {
        queryFilterRef.current.focus();
        onChange(selectedItems);
    }, [selectedItems])

    const [optionsState, _setOptionsState] = useState(options);
    const optionsStateRef = useRef(optionsState);
    const setOptionsState = (items) => {
        optionsStateRef.current = items;
        _setOptionsState(items);
    }


    return (
        <div className={formStyles.multiSelectContainer} ref={ref}>
            <div className={formStyles.selectedContainer}>
                {selectedItems.map((item, index) => {
                    return (
                        <div key={`${index}-${item.text}`} className={formStyles.selectedItem}>
                            <div className={formStyles.selectedItemText}>{item.text}</div>
                            <div className={formStyles.selectedItemRemoveIcon} onClick={() => setSelectedItems(selectedItems.filter((_item, _index) => _index !== index))}>close</div>
                        </div>
                    )
                })}
            </div>
            <div className={formStyles.multiSelectInputSearchContainer}>
                <input
                    className={formStyles.multiSelectInputSearch}
                    type="text" name="friends_search"
                    placeholder="Type the username of a friend..."
                    autoCapitalize="none" autoCorrect="off" autoComplete="off" spellCheck="false"
                    ref={queryFilterRef}
                    onInput={(e) => {
                        const search = e.target.value;

                        // check if each friend name contains the letters of the search string in correct order with or without gaps
                        const filtered = options.filter(option => { // filtering algorithm
                            const searchArr = search.split('');
                            const optionArr = option.text.split('');
                            const indices = []; // used to store the indices of the letters in the search string to check order of characters

                            let included = true;

                            for (const val of searchArr) {
                                if (optionArr.includes(val)) {
                                    let index = optionArr.indexOf(val)
                                    while (index !== -1) {
                                        if (index < indices[indices.length - 1]) {
                                            optionArr[index] = null;
                                            index = optionArr.indexOf(val)
                                            included = false;
                                            continue
                                        } else {
                                            indices.push(index);
                                            optionArr[index] = null;
                                            included = true;
                                            break
                                        }
                                    }
                                } else {
                                    included = false;
                                    break
                                }
                            }

                            return included;
                        });

                        setOptionsState(filtered);
                    }}
                />
                <div className={formStyles.multiSelectInputSearchClearBtn}
                    onClick={() => {
                        setOptionsState(options);
                        queryFilterRef.current.value = '';
                        queryFilterRef.current.focus();
                    }}
                >
                    clear
                </div>
            </div>

            <div className={formStyles.optionsContainer}>
                {optionsStateRef.current.map((option, index) => {
                    return (
                        <Option key={`${index}-${option.text}`} text={option.text} icon={option.icon} data={option.data} selectedItems={selectedItems} setSelectedItems={setSelectedItems} />
                    )
                })}
            </div>
        </div>
    )
}