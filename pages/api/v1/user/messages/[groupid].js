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
    const { groupid } = req.query

    const group = await QueryGroup({ groupId: groupid })
    if(group.members.includes(user.uid)) {
        res.status(200).send({ messages: group.messages });
    } else {
        res.status(403).send({ error: "You are not a member of this group" });
    }
}

export default apiHandler(userInfoHandler, ['jwt', 'cors']);