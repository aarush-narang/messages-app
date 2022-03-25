import { QueryUser, UpdateUser } from "../../../../../lib/mongo"
import { apiHandler } from '../../../../../lib/helpers/api-handler'
import { generateAccessToken, generateRefreshToken } from "../../../../../lib/helpers/jwt-middleware";

import crypto from 'crypto'
import getConfig from 'next/config';
const { serverRuntimeConfig } = getConfig();

/** 
 * @param {string} email
 * @returns {boolean|null}
 */
const validateEmail = (email) => {
    const email_regex = /^(([^<>()\[\]\\.,;:\s@\"]+(\.[^<>()\[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    return email.match(email_regex)
}

/**
 * @param {Request} req 
 * @param {Response} res 
 * @returns {Promise<Response>}
 */
async function SignInHandler(req, res) {
    if (req.method !== 'POST') return res.status(405).send(`Method ${req.method} Not Allowed`)

    const { email, password } = JSON.parse(req.body);
    if (!email || !password) {
        return res.status(400).json({
            status: 'BAD_REQUEST'
        })
    } else if (!validateEmail(email)) { // if email is not valid
        return res.status(200).json({
            status: 'INVALID_EMAIL'
        })
    }

    const user = await QueryUser({ user: { email, password } });
    if (!user) {
        return res.status(200).json({
            status: 'NOT_FOUND'
        })
    }

    const accessToken = generateAccessToken({ token: user.token, username: user.username, uid: user.uid })
    const refreshToken = generateRefreshToken({ rb: crypto.randomBytes(32).toString('hex'), uid: user.uid })
    // when user logs in, look for their current ip in previous sessions and restore it if it exists
    const refreshTokens = user.refreshTokens ? user.refreshTokens : [];
    await UpdateUser({ user: { uid: user.uid }, newData: { refreshTokens: refreshTokens.concat({ refreshToken, ip: '0.0.0.0', location: 'US' }) } })

    // return basic user details and token
    res.setHeader('Set-Cookie', [`accessToken=${accessToken}; HttpOnly; Path=/`, `refreshToken=${refreshToken}; HttpOnly; Path=/`]);
    return res.send({
        status: 'SUCCESS',
        id: user.uid,
        username: user.username,
        // also send other user info like encryption key for their messages
    });

}

export default apiHandler(SignInHandler);