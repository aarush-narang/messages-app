import { apiHandler } from '../../../../lib/helpers/api-handler'

import crypto from 'crypto'
import getConfig from 'next/config';
const { serverRuntimeConfig } = getConfig();

/**
 * @param {Request} req 
 * @param {Response} res 
 * @returns {Promise<Response>}
 */
async function SignInHandler(req, res) {
    if (req.method !== 'GET') return res.status(405).send(`Method ${req.method} Not Allowed`)
    const dh1 = crypto.getDiffieHellman('modp14')
    const dh2 = crypto.getDiffieHellman('modp14')
    dh1.generateKeys()
    dh2.generateKeys()
    const secret1 = dh1.computeSecret(dh2.getPublicKey(), 'hex')
    const secret2 = dh2.computeSecret(dh1.getPublicKey(), 'hex')
    return res.status(200).send({dh1, dh2, secret1, secret2})
}

export default (SignInHandler);