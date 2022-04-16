import { apiHandler } from '../../../../lib/helpers/api-handler'

import crypto from 'crypto'
import aes from 'aes-js'
import getConfig from 'next/config';
const { serverRuntimeConfig } = getConfig();

/**
 * @param {Request} req 
 * @param {Response} res 
 * @returns {Promise<Response>}
 */
async function SignInHandler(req, res) {
    if (req.method !== 'GET') return res.status(405).send(`Method ${req.method} Not Allowed`)
    const dh1 = crypto.getDiffieHellman('modp14') // DH group 14
    const dh2 = crypto.getDiffieHellman('modp14')

    dh1.generateKeys() // generate private and public keys
    dh2.generateKeys()

    const secret1 = dh1.computeSecret(dh2.getPublicKey()) // compute secret
    const secret2 = dh2.computeSecret(dh1.getPublicKey())

    const fe = aes.utils.utf8.toBytes(secret1.toString('hex'))
    const aesCbc = new aes.ModeOfOperation.cbc(fe, crypto.randomBytes(16))
    const encrypted = aesCbc.encrypt(aes.utils.utf8.toBytes('test'))
    console.log(encrypted)
    

    return res.status(200).send()
}

export default (SignInHandler);