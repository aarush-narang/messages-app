import { useCallback, useEffect, useRef } from "react"
import Cookies from 'js-cookie'

// Hooks
export function useTimeout(callback, delay) {
    const callbackRef = useRef(callback)
    const timeoutRef = useRef()

    useEffect(() => {
        callbackRef.current = callback
    }, [callback])

    const set = useCallback(() => {
        timeoutRef.current = setTimeout(() => callbackRef.current(), delay)
    }, [delay])

    const clear = useCallback(() => {
        timeoutRef.current && clearTimeout(timeoutRef.current)
    }, [])

    useEffect(() => {
        set()
        return clear
    }, [delay, set, clear])

    const reset = useCallback(() => {
        clear()
        set()
    }, [clear, set])

    return { reset, clear }
}

export function useDebounce(callback, delay, dependencies) {
    const { reset, clear } = useTimeout(callback, delay)
    useEffect(reset, [...dependencies, reset])
    useEffect(clear, [])
}

export function useThrottle(cb, delay = 1000) {
    let shouldWait = false
    let waitingArgs
    const timeoutFunc = () => {
        if (waitingArgs == null) {
            shouldWait = false
        } else {
            cb(...waitingArgs)
            waitingArgs = null
            setTimeout(timeoutFunc, delay)
        }
    }

    return (...args) => {
        if (shouldWait) {
            waitingArgs = args
            return
        }

        cb(...args)
        shouldWait = true

        setTimeout(timeoutFunc, delay)
    }
}

export async function useRefetchToken(callback) { // callback is a function that returns a fetch response
    const res = await callback()
    if (res.status !== 200) {
        const newToken = await fetch('http://localhost:3000/api/v1/auth/account/token', { // refresh token
            method: 'GET',
            headers: {
                Authorization: 'Bearer ' + Cookies.get('refreshToken'),
            }
        }).then(res => res.json())

        if (!newToken) {
            Cookies.set('accessToken', 'deleted', { expires: 0 })
            Cookies.set('refreshToken', 'deleted', { expires: 0 })
            window.location.reload()
        }
        return await callback()
    }
    return res
}

export async function fetchUserInfo(accessToken, uid) {
    return await useRefetchToken(async () => {
        return await fetch(`http://localhost:3000/api/v1/user/publicUserInfo/${uid}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            }
        }).then(res => res.json())
    })
}

// Util
export function shortenName(name) {
    if (name.length > 15) {
        return name.substring(0, 12) + '...'
    }
    return name
}

export function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}