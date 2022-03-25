import { apiHandler } from "../../../../../lib/helpers/api-handler"

function handleAccessToken(req, res) {
    const { token } = req
    res.setHeader('Set-Cookie', [`accessToken=${token}; HttpOnly; Path=/`]);
    return res.json({ message: 'SUCCESS' })
}

export default apiHandler(handleAccessToken)