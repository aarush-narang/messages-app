import getConfig from 'next/config';
import jwt from 'jsonwebtoken';
import { QueryUser } from '../../lib/mongo'

const { serverRuntimeConfig } = getConfig();

export async function jwtMiddleware(req, res) {
    const auth = req.headers.authorization;
    const token = auth && auth.split(' ')[1];
    if (!token) throw new Error().data = { name: 'UnauthorizedError', message: 'Invalid Token 1', status: 401 };
    if (req.url === '/api/v1/auth/account/token') {
        await jwt.verify(token, serverRuntimeConfig.refreshTokenSecret, { algorithms: ['HS256'] }, async (err, decoded) => {
            if (err && decoded) throw new Error().data = { name: 'UnauthorizedError', message: 'Authentication Failed', status: 403 }; // if token is expired but valid
            else if (err && !decoded) throw new Error().data = { name: 'UnauthorizedError', message: 'Invalid Token 2', status: 401 }; // if token is invalid

            // check if uid matches and token exists
            const user = await QueryUser({ user: { uid: decoded.uid } })
            if (!user) throw new Error().data = { name: 'UnauthorizedError', message: 'Invalid Token 3', status: 401 };
            let tokenEval = false
            user.refreshTokens.forEach(r => {
                // parse the refresh token and check expiry dates and remove expired tokens
                const refreshToken = jwt.decode(r.refreshToken, { json: true })
                if (refreshToken.exp < Date.now() / 1000) {
                    user.refreshTokens = user.refreshTokens.filter(t => t.token !== r.refreshToken)
                }
                if (r.refreshToken === token) return tokenEval = true
            })
            if (!tokenEval) throw new Error().data = { name: 'UnauthorizedError', message: 'Invalid Token 4', status: 401 };
            else {
                // generate new accessToken
                const accessToken = generateAccessToken({ token: user.token, username: user.username, uid: user.uid })
                // token coming as undefined in the actual handler function, it is defined above though
                req.token = accessToken
            }
        })
    } else {
        jwt.verify(token, serverRuntimeConfig.accessTokenSecret, { algorithms: ['HS256'] }, (err, decoded) => {
            if (err) throw new Error().data = { name: 'UnauthorizedError', message: 'Authentication Failed', status: 403 };
            req.user = decoded;
        })
    }
    return
}

export function generateAccessToken(user) {
    return jwt.sign(user, serverRuntimeConfig.accessTokenSecret, { expiresIn: '30m' });
}
export function generateRefreshToken(user) {
    return jwt.sign(user, serverRuntimeConfig.refreshTokenSecret, { expiresIn: '30d' });
}

export function decodeJWT(token) {
    return jwt.decode(token, { json: true });
}