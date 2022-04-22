import { apiHandler } from '../../../../../lib/helpers/api-handler'
import { QueryGroup } from '../../../../../lib/mongo';

export async function handleImageRequest(req, res) {
    const { groupid } = req.query;

    const group = await QueryGroup({ groupId: groupid })
    if(group) {
        res.status(200).send(group);
    }
    else {
        res.status(404).send('Group not found');
    }
}

export default apiHandler(handleImageRequest, ['cors'])