import { apiHandler } from "../../../../../lib/helpers/api-handler";
import { QueryUser, UpdateUser } from '../../../../../lib/mongo'

export async function handleUpdateGroupOrder(req, res) {
    if (req.method !== 'POST') return res.status(405).send(`Method ${req.method} Not Allowed`)

    const { token, uid, username } = req.user
    const newOrder = req.body

    const dbUser = await QueryUser({ user: { token, uid, username } })
    const groups = dbUser.groups

    // sort groups object by new order object
    groups.sort((a, b) => {
        const aIndex = newOrder.findIndex(item => Number(item.id) === a.id)
        const bIndex = newOrder.findIndex(item => Number(item.id) === b.id)

        a.order = aIndex
        b.order = bIndex

        return aIndex - bIndex
    })

    await UpdateUser({ user: { token, uid, username }, newData: { groups } })

    res.status(200).send()
}

export default apiHandler(handleUpdateGroupOrder, ['csrf', 'jwt']);