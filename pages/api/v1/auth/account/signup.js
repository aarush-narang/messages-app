// check if email is a valid email, then check if email already exists
import { InsertUser, QueryUser, UpdateUser } from "../../../../../lib/mongo"
import { apiHandler } from '../../../../../lib/helpers/api-handler'
import { generateAccessToken, generateRefreshToken } from "../../../../../lib/helpers/jwt-middleware";

// import IPData from "ipdata";
import crypto from 'crypto'
// import getConfig from 'next/config';
// const { serverRuntimeConfig } = getConfig();


/**
 * @param {Request} req 
 * @param {Response} res 
 * @returns {Promise<Response>}
 */
async function SignUpHandler(req, res) {
    if (req.method !== 'POST') return res.status(405).send(`Method ${req.method} Not Allowed`)

    const { username, email, password, confirm_password, ip } = req.body;
    if (!username || !email || !password || !confirm_password) return res.status(400).json({})

    // check if email or username already exist
    const usernameCheck = await QueryUser({ user: { username } });
    if (usernameCheck) return res.status(400).json({ message: 'DUPLICATE_USERNAME' });

    const emailCheck = await QueryUser({ user: { email } });
    if (emailCheck) return res.status(400).json({ message: 'DUPLICATE_EMAIL' });

    // insert user into db, create access and refresh tokens and send back to client
    const user = await InsertUser({ user: { username, email, password } })

    const accessToken = generateAccessToken({ token: user.token, username: user.username, uid: user.uid })
    const refreshToken = generateRefreshToken({ rb: crypto.randomBytes(32).toString('hex'), uid: user.uid })
    // TODO: when user logs in, look for their current ip in previous sessions and restore it if it exists
    const refreshTokens = user.refreshTokens ? user.refreshTokens : [];

    if (ip) {
        // const ipData = new IPData(serverRuntimeConfig.ipDataApiKey);
        // const ipDataRes = await ipData.lookup(ip);
        const ipDataRes = {
            city: null,
            region: null,
            region_code: null,
            postal: null,
        }
        await UpdateUser({ user: { uid: user.uid, token: user.token }, newData: { refreshTokens: refreshTokens.concat({ refreshToken, ip, location: `${ipDataRes.city}, ${ipDataRes.region} (${ipDataRes.region_code}) ${ipDataRes.postal}`, createdAt: Date.now() }) } })
    } else {
        await UpdateUser({ user: { uid: user.uid, token: user.token }, newData: { refreshTokens: refreshTokens.concat({ refreshToken, ip: 'Could not get IP', location: 'Could not get Location', createdAt: Date.now() }) } })
    }
    // return basic user details and token
    res.setHeader('Set-Cookie', [`accessToken=${accessToken}; Path=/; SameSite`, `refreshToken=${refreshToken}; Path=/; SameSite`]);
    return res.send({
        status: 'SUCCESS',
        // also send other user info like encryption key for their messages
    });

}

export default apiHandler(SignUpHandler, ['csrf']);