import formStyles from "../styles/FormStyles/FormComponents.module.css";
import ErrorPage from 'next/error'
import { useEffect, useRef, useState } from "react";

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

// Multi Select Components
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

// Other
export function Spinner({ width, height, thickness, color, animationDuration = '.85s', animationTimingFunction = 'cubic-bezier(0.14, 0.28, 0.29, 0.87)' }) {
    return (
        <div className={formStyles.spinner} style={{ width, height, borderWidth: thickness, borderColor: color, borderRightColor: 'transparent', animationDuration, animationTimingFunction }}></div>
    )
}
export function ErrorMessage({ error, ...props }) {
    const errorStyles = {
        ...props,
    }

    return (
        <p className={formStyles.error} style={errorStyles}>{error}</p>
    )
}

export function Page404() {
    return <ErrorPage statusCode={404} />
}