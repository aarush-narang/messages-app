import { QueryUser } from "../../../../../lib/mongo"
import { apiHandler } from "../../../../../lib/helpers/api-handler"
import { parseJwt } from "../../../../../lib/util"

/**
 * 
 * @param {Request} req 
 * @param {Response} res 
 */
async function userInfoHandler(req, res) {
    if(req.method !== 'GET') return res.status(404).send()

    const auth = req.headers.authorization
    const token = auth.split(' ')[1]
    const extToken = parseJwt(token)
    
    // get user info from the token passed in the cookeis in the request
    const user = await QueryUser({ token: extToken.sub })

    res.status(200).send({ messages: user.messages });
}

export default apiHandler(userInfoHandler);