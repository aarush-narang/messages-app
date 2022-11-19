import { QueryUser, UpdateUser } from "../../../../../lib/mongo"
import { apiHandler } from '../../../../../lib/helpers/api-handler'
import { generateAccessToken, generateRefreshToken } from "../../../../../lib/helpers/jwt-middleware";
import IPData from "ipdata";

import crypto from 'crypto'
import getConfig from 'next/config';
const { serverRuntimeConfig } = getConfig();


/**
 * @param {Request} req 
 * @param {Response} res 
 * @returns {Promise<Response>}
 */
async function SignInHandler(req, res) {
    if (req.method !== 'POST') return res.status(405).send(`Method ${req.method} Not Allowed`)

    const { email, password, ip } = req.body;

    if (!email || !password || !ip) return res.status(400).send()

    const user = await QueryUser({ user: { email, password } });
    if (!user) return res.status(404).send()

    const accessToken = generateAccessToken({ token: user.token, username: user.username, uid: user.uid })
    const refreshToken = generateRefreshToken({ rb: crypto.randomBytes(32).toString('hex'), uid: user.uid })
    // when user logs in, look for their current ip in previous sessions and restore it if it exists
    const refreshTokens = user.refreshTokens ? user.refreshTokens : [];

    const ipData = new IPData(serverRuntimeConfig.ipDataApiKey);
    const ipDataRes = await ipData.lookup(ip);

    await UpdateUser({ user: { uid: user.uid, token: user.token }, newData: { refreshTokens: refreshTokens.concat({ refreshToken, ip, location: `${ipDataRes.city}, ${ipDataRes.region} (${ipDataRes.region_code}) ${ipDataRes.postal}`, createdAt: Date.now() }) } })

    // return basic user details and token
    res.setHeader('Set-Cookie', [`accessToken=${accessToken}; Path=/; SameSite`, `refreshToken=${refreshToken}; Path=/; SameSite`]);
    return res.status(200).send()
}

export default apiHandler(SignInHandler, ['csrf']);