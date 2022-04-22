import { QueryGroup, QueryUser } from "../../../../../lib/mongo"
import { apiHandler } from "../../../../../lib/helpers/api-handler"

/**
 * 
 * @param {Request} req 
 * @param {Response} res 
 */
async function userInfoHandler(req, res) {
    if (req.method !== 'GET') return res.status(405).send(`Method ${req.method} Not Allowed`)

    const user = req.user

    // get user info from the token passed in the cookeis in the request
    const dbuser = await QueryUser({ user: { token: user.token } })
    const groups = [...dbuser.groups]

    const groupInfo = []
    for (let i = 0; i < groups.length; i++) {
        const group = await QueryGroup({ groupId: groups[i].id })
        groupInfo.push(group)
    }
    res.status(200).send({ groups: groupInfo });
}

export default apiHandler(userInfoHandler);