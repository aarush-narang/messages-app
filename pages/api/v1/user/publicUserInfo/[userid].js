import { QueryUser } from "../../../../../lib/mongo"
import { apiHandler } from "../../../../../lib/helpers/api-handler"

/**
 * 
 * @param {Request} req 
 * @param {Response} res 
 */
async function userInfoHandler(req, res) {
    if (req.method !== 'GET') return res.status(405).send(`Method ${req.method} Not Allowed`)

    const { userid } = req.query

    // get user info from the token passed in the cookeis in the request
    const dbuser = await QueryUser({ user: { uid: userid } })

    if(!dbuser) return res.status(404).send();
  
    const objEntries = Object.entries(dbuser).filter(([key, value]) => ['username', 'uid', 'createdAt', 'icon'].includes(key))
    const userInfo = Object.fromEntries(objEntries)

    res.status(200).send({ user: userInfo });
}

export default apiHandler(userInfoHandler);