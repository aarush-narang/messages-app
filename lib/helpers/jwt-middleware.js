import getConfig from 'next/config';
import jwt from 'jsonwebtoken';

const { serverRuntimeConfig } = getConfig();

export function jwtMiddleware(req, res) {
    const unauthenticatedRoutes = [
        '/api/v1/auth/account/signup',
        '/api/v1/auth/account/signin',
    ]
    if (unauthenticatedRoutes.includes(req.url)) return;

    const auth = req.headers.authorization;
    const token = auth && auth.split(' ')[1];
    if (token == null) throw new Error().data = { name: 'UnauthorizedError', message: 'Invalid Token', status: 401 };
    jwt.verify(token, serverRuntimeConfig.accessTokenSecret, { algorithms: ['HS256'] }, (err, decoded) => {
        if (err) throw new Error().data = { name: 'UnauthorizedError', message: 'Authentication Failed', status: 403 };
        if (Date.now() >= decoded.exp * 1000) throw new Error().data = { name: 'UnauthorizedError', message: 'Token Expired', status: 401 };
        req.user = decoded;
    })
}

export function generateAccessToken(user) {
    return jwt.sign({ sub: user }, serverRuntimeConfig.accessTokenSecret, { expiresIn: '15s' }); // change to 15 min
}
export function generateRefreshToken(user) {
    return jwt.sign({ sub: user }, serverRuntimeConfig.refreshTokenSecret);
}