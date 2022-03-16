export function errorHandler(err, res) {
    if (typeof (err) === 'string') {
        // custom application error
        return res.status(400).json({ message: err });
    }
    else if (err.status && err.message) {
        // jwt authentication error
        return res.status(err.status).json({ error: err.name, message: err.message });
    }
    // default to 500 server error
    return res.status(500).json({ error: err.name, message: err.message });
}