import { apiHandler } from "../../../../../lib/helpers/api-handler"
import { refreshTokens } from "./signin"
import jwt from 'jsonwebtoken';
import getConfig from 'next/config';
import { generateAccessToken } from "../../../../../lib/helpers/jwt-middleware";
const { serverRuntimeConfig } = getConfig();

function handleAccessToken(req, res) {
    console.log(req.body, req.headers)
    const refreshToken = req.body.refreshToken
    if (!refreshToken || refreshToken == null) return res.status(401).send('Unauthorized')
    if (!refreshTokens.includes(refreshToken)) return res.status(403).send('Forbidden')

    jwt.verify(refreshToken, serverRuntimeConfig.refreshTokenSecret, (err, user) => {
        if(err) return res.status(403).send('Forbidden')
        const accessToken = generateAccessToken({ token: user.token, username: user.username, uid: user.uid })
        return res.json({ accessToken })
    })
}

export default apiHandler(handleAccessToken)