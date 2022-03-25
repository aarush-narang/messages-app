import getConfig from 'next/config';
import jwt from 'jsonwebtoken';
import { QueryUser } from '../../lib/mongo'

const { serverRuntimeConfig } = getConfig();

export async function jwtMiddleware(req, res) {
    const unauthenticatedRoutes = [
        '/api/v1/auth/account/signup',
        '/api/v1/auth/account/signin',
    ]
    if (unauthenticatedRoutes.includes(req.url)) return;

    const auth = req.headers.authorization;
    const token = auth && auth.split(' ')[1];
    if (!token) throw new Error().data = { name: 'UnauthorizedError', message: 'Invalid Token', status: 401 };

    if (req.url === '/api/v1/auth/account/token') {
        jwt.verify(token, serverRuntimeConfig.refreshTokenSecret, { algorithms: ['HS256'] }, async (err, decoded) => {
            if (err) throw new Error().data = { name: 'UnauthorizedError', message: 'Authentication Failed', status: 403 };

            // check if uid matches and token exists
            const user = await QueryUser({ user: { uid: decoded.sub.uid } })
            if (!user) return res.status(401).send('Unauthorized')
            let tokenEval = false
            user.refreshTokens.forEach(r => {
                // parse the refresh token and check expiry dates and remove expired tokens
                if (r.refreshToken === token) return tokenEval = true
            })
            if (!tokenEval) throw new Error().data = { name: 'UnauthorizedError', message: 'Invalid Token', status: 401 };

            // generate new accessToken
            const accessToken = generateAccessToken({ token: user.token, username: user.username, uid: user.uid })
            // token coming as undefined in the actual handler function, it is defined above though
            req.token = accessToken
        })
    } else {
        jwt.verify(token, serverRuntimeConfig.accessTokenSecret, { algorithms: ['HS256'] }, (err, decoded) => {
            if (err) throw new Error().data = { name: 'UnauthorizedError', message: 'Authentication Failed', status: 403 };
            req.user = decoded;
        })
    }
}

export function generateAccessToken(user) {
    return jwt.sign({ sub: user }, serverRuntimeConfig.accessTokenSecret, { expiresIn: '5s' });
}
export function generateRefreshToken(user) {
    return jwt.sign({ sub: user }, serverRuntimeConfig.refreshTokenSecret, { expiresIn: '30d' });
}