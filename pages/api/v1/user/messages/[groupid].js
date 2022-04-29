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
        const messages = [...group.messages]
        const authors = []

        for(const message of messages) {
            const findArr = authors.find(author => author.uid == message.author.uid)
            if (findArr) {
                message.author = findArr
            }
            else {
                const dbuser = await QueryUser({ user: { uid: message.author } })
                const objEntries = Object.entries(dbuser).filter(([key, value]) => ['username', 'uid', 'createdAt', 'icon'].includes(key))
                const userInfo = Object.fromEntries(objEntries)

                authors.push(userInfo)
                message.author = userInfo
            }
        }
        res.status(200).send(messages);
    } else {
        res.status(403).send({ error: "You are not a member of this group" });
    }
}

export default apiHandler(userInfoHandler, ['jwt', 'cors']);