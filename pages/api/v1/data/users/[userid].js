import { apiHandler } from '../../../../../lib/helpers/api-handler'
import { QueryUser } from '../../../../../lib/mongo';

export async function handleUserRequest(req, res) {
    const { userid } = req.query;
    // look for the image in the images folder @ public/images

    const user = await QueryUser({ user: { uid: userid } })
    if(user) {
        res.status(200).send(user);
    }
    else {
        res.status(404).send('User not found');
    }
}

export default apiHandler(handleUserRequest, ['cors'])