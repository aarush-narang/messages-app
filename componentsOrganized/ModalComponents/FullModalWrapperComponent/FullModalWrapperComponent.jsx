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