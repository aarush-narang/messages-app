import getConfig from 'next/config';
import Cookies from 'js-cookie';

const { publicRuntimeConfig } = getConfig();
const baseURL = publicRuntimeConfig.baseURL;

export function get(url, token) {
    const requestOptions = {
        method: 'GET',
        headers: authHeader(url, token),
    };
    return fetch(url, requestOptions).then(handleResponse);
}

export function post(url, token, body) {
    const requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader(url, token) },
        credentials: 'include',
        body: JSON.stringify(body)
    };
    return fetch(url, requestOptions).then(handleResponse);
}

export function put(url, token, body) {
    const requestOptions = {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeader(url, token) },
        body: JSON.stringify(body)
    };
    return fetch(url, requestOptions).then(handleResponse);    
}

// prefixed with underscored because delete is a reserved word in javascript
export function _delete(url, token) {
    const requestOptions = {
        method: 'DELETE',
        headers: authHeader(url, token)
    };
    return fetch(url, requestOptions).then(handleResponse);
}

// helper export functions

export function authHeader(url, token) {
    // return auth header with jwt if user is logged in and request is to the api url
    const user = token.accessToken;
    const isLoggedIn = token && user;
    const isApiUrl = url.startsWith(baseURL);
    if(!isApiUrl) url = baseURL + url;
    if (isLoggedIn) {
        return { Authorization: `Bearer ${user}` };
    } else {
        return {};
    }
}

export function handleResponse(response) {
    return response.text().then(text => {
        const data = text && JSON.parse(text);
        
        if (!response.ok) {
            if ([401, 403].includes(response.status)) {
                // auto logout if 401 Unauthorized or 403 Forbidden response returned from api
                // userService.logout();
            }

            const error = (data && data.message) || response.statusText;
            return Promise.reject(error);
        }

        return data;
    });
}