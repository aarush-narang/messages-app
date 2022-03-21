import { QueryUser } from "../../../../../lib/mongo"
import { apiHandler } from "../../../../../lib/helpers/api-handler"

/**
 * 
 * @param {Request} req 
 * @param {Response} res 
 */
async function userInfoHandler(req, res) {
    if(req.method !== 'GET') return res.status(404).send()

    const extToken = req.user

    // get user info from the token passed in the cookeis in the request
    const user = await QueryUser({ user: { token: extToken.sub.token }})

    res.status(200).send({ messages: user.messages });
}

export default apiHandler(userInfoHandler);