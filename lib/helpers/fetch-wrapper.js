import getConfig from 'next/config';

const { publicRuntimeConfig } = getConfig();
const baseURL = publicRuntimeConfig.baseURL;

export function get(url, cookies) {
    const requestOptions = {
        method: 'GET',
        headers: authHeader(url, cookies)
    };
    return fetch(url, requestOptions).then(handleResponse);
}

export function post(url, cookies, body) {
    const requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader(url, cookies) },
        credentials: 'include',
        body: JSON.stringify(body)
    };
    return fetch(url, requestOptions).then(handleResponse);
}

export function put(url, cookies, body) {
    const requestOptions = {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeader(url, cookies) },
        body: JSON.stringify(body)
    };
    return fetch(url, requestOptions).then(handleResponse);    
}

// prefixed with underscored because delete is a reserved word in javascript
export function _delete(url, cookies) {
    const requestOptions = {
        method: 'DELETE',
        headers: authHeader(url, cookies)
    };
    return fetch(url, requestOptions).then(handleResponse);
}

// helper export functions

export function authHeader(url, cookies) {
    // return auth header with jwt if user is logged in and request is to the api url
    const user = cookies.token;
    const isLoggedIn = cookies && user;
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