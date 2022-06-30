import modalStyles from "../styles/ChatStyles/ModalComponentStyles.module.css";
import { useState, useEffect } from "react";

// Modals
export function MiniNotificationModal({ state, setState }) { // click to close, status will determine icon and color, message will be displayed
    const [hover, setHover] = useState(false)
    const text = state.data ? state.data.message : ''

    function closeModal() {
        setState({ state: `close ${state.state}`, data: state.data })
        const timeout = setTimeout(() => {
            setState({ state: 'null', data: null })
            clearTimeout(timeout)
        }, 300);
    }

    useEffect(() => { // Close modal after 3 seconds
        if (state.state.match(/null/g) || hover) return

        const timeout = setTimeout(closeModal, 3000);

        return () => {
            clearTimeout(timeout)
        }
    }, [state.state, hover])

    return (
        <div className={modalStyles.miniModalContainer} data-state={state.state}
            onClick={closeModal}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
        >
            {text}
        </div>
    )
}
export function FullModalWrapper({ modalIsOpen, closeModal, children }) {
    return (
        <div className={modalStyles.fullModalContainer} data-state={modalIsOpen} style={{ opacity: modalIsOpen ? '' : '0', pointerEvents: modalIsOpen ? 'all' : 'none'}}>
            <div className={modalStyles.fullModalBackground} onClick={closeModal}></div>
            <div className={modalStyles.fullModalContent}>
                <div className={modalStyles.fullModalClose}>
                    <div className={modalStyles.fullModalCloseIcon} onClick={closeModal}>close</div>
                </div>
                <div className={modalStyles.fullModalChildren}>{children}</div>
            </div>
        </div>
    )
}
