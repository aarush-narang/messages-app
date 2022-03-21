export function parseJwt(token) {
    var base64Url = token.split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
};

export async function fetchNewToken(cookies) {
    const r = await fetch('http://localhost:3000/api/v1/auth/account/token', { // refresh token
        method: 'GET',
        headers: {
            Authorization: 'Bearer ' + cookies.refreshToken
        }
    })
        .then(r => r.json())
        .catch(err => {
            return null
        })

    if (!r) {
        return null
    }
    
    return r.accessToken
}