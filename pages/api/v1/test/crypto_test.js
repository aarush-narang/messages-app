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
    const dh1 = crypto.getDiffieHellman('modp2') // DH group 14
    const dh2 = crypto.getDiffieHellman('modp2')

    dh1.generateKeys() // generate private and public keys
    dh2.generateKeys()

    const secret1 = dh1.computeSecret(dh2.getPublicKey(), null, 'hex') // compute shared secret key
    const secret2 = dh2.computeSecret(dh1.getPublicKey(), null, 'hex')
    console.log(secret1 === secret2) // true; both shared secret keys are the same
    return res.status(200).send()
}

export default (SignInHandler);