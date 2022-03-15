import {
    QueryUser
} from "../../../../../lib/mongo"
import {
    apiHandler
} from '../../../../../lib/helpers/api-handler'

import jwt from 'jsonwebtoken'
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

    const user = await QueryUser(email, password);

    if (!user) {
        return res.status(200).json({
            status: 'NOT_FOUND'
        })
    }

    // create a jwt token that is valid for 7 days
    const jwtToken = jwt.sign({ sub: user.token }, serverRuntimeConfig.secret, { expiresIn: '7d', algorithm: 'HS256' });

    // return basic user details and token
    return res.send({
        status: 'SUCCESS',
        id: user.uid,
        username: user.username,
        token: jwtToken,
        // also send other user info like encryption key for their messages
    });

}

export default apiHandler(SignInHandler);