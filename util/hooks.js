import { useCallback, useEffect, useRef, useState } from "react";
import Cookies from "js-cookie";

export function useTimeout(callback, delay) {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef();

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const set = useCallback(() => {
    timeoutRef.current = setTimeout(() => callbackRef.current(), delay);
  }, [delay]);

  const clear = useCallback(() => {
    timeoutRef.current && clearTimeout(timeoutRef.current);
  }, []);

  useEffect(() => {
    set();
    return clear;
  }, [delay, set, clear]);

  const reset = useCallback(() => {
    clear();
    set();
  }, [clear, set]);

  return { reset, clear };
}
export function useDebounce(callback, delay, dependencies) {
  const { reset, clear } = useTimeout(callback, delay);
  useEffect(reset, [...dependencies, reset]);
  useEffect(clear, []);
}
export function useThrottle(cb, delay = 1000) {
  let shouldWait = false;
  let waitingArgs;
  const timeoutFunc = () => {
    if (waitingArgs == null) {
      shouldWait = false;
    } else {
      cb(...waitingArgs);
      waitingArgs = null;
      setTimeout(timeoutFunc, delay);
    }
  };

  return (...args) => {
    if (shouldWait) {
      waitingArgs = args;
      return;
    }

    cb(...args);
    shouldWait = true;

    setTimeout(timeoutFunc, delay);
  };
}
export async function useRefetchToken(callback) {
  // callback is a function that returns a fetch response
  const res = await callback();
  if (res.status !== 200) {
    const newToken = await fetch(
      "http://localhost:3000/api/v1/auth/account/token",
      {
        // refresh token
        method: "GET",
        headers: {
          Authorization: "Bearer " + Cookies.get("refreshToken"),
        },
      }
    ).then((res) => res.json());

    if (!newToken) {
      Cookies.set("accessToken", "deleted", { expires: 0 });
      Cookies.set("refreshToken", "deleted", { expires: 0 });
      window.location.reload();
    }
    return await callback();
  }
  return res;
}
export function useReferredState(initialValue) {
  const [state, setState] = useState(initialValue);
  const reference = useRef(state);

  const setReferredState = (value) => {
    reference.current = value;
    setState(value);
  };

  return [reference.current, setReferredState];
}
