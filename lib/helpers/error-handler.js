export function errorHandler(err, res) {
    if (typeof (err) === 'string') {
        // custom application error
        return res.status(400).json({ message: err });
    }
    else if (err.status && err.message) {
        // jwt authentication error
        if(err.status === 401) { // if token is invalid, remove it from the cookies
            res.setHeader('Set-Cookie', [`accessToken=deleted; Max-Age=0`, `refreshToken=deleted; Max-Age=0`]);
        }
        return res.status(err.status).json({ error: err.name, message: err.message });
    }
    // default to 500 server error
    return res.status(500).json({ error: err.name, message: err.message });
}