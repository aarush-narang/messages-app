import { QueryUser } from "../../../../../lib/mongo"
import { apiHandler } from "../../../../../lib/helpers/api-handler"

/**
 * 
 * @param {Request} req 
 * @param {Response} res 
 */
async function userInfoHandler(req, res) {
    if(req.method !== 'GET') return res.status(404).send()

    const user = req.user
    console.log(user)
    // get user info from the token passed in the cookeis in the request
    const dbuser = await QueryUser({ user: { token: user.sub.token }})

    res.status(200).send({ messages: dbuser.messages });
}

export default apiHandler(userInfoHandler);