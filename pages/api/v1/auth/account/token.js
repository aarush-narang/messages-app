import { apiHandler } from "../../../../../lib/helpers/api-handler"
import jwt from 'jsonwebtoken';
import getConfig from 'next/config';
import { generateAccessToken } from "../../../../../lib/helpers/jwt-middleware";
import { QueryUser } from "../../../../../lib/mongo"
const { serverRuntimeConfig } = getConfig();

async function handleAccessToken(req, res) {
    const refreshToken = req.headers.authorization.split(' ')[1]
    if (!refreshToken || refreshToken == null) return res.status(401).send('Unauthorized')

    const r = jwt.verify(refreshToken, serverRuntimeConfig.refreshTokenSecret, async (err, decoded) => {
        if (err) return res.status(403).send('Forbidden')

        // check if uid matches and token exists
        const user = await QueryUser({ user: { uid: decoded.sub.uid } })
        if (!user) return res.status(401).send('Unauthorized')
        let tokenEval = false
        user.refreshTokens.forEach(r => {
            if (r.refreshToken === refreshToken) return tokenEval = true // parse the refresh token and check expiry dates and remove expired tokens
        })
        if (!tokenEval) return res.status(401).send('Unauthorized')

        // generate new accessToken
        const accessToken = generateAccessToken({ token: user.token, username: user.username, uid: user.uid })
        return res.json({ accessToken })
    })
    return r
}

export default apiHandler(handleAccessToken)