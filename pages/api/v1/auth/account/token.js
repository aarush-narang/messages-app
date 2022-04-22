import { apiHandler } from "../../../../../lib/helpers/api-handler"

function handleAccessToken(req, res) {
    const token = req.token

    res.setHeader('Set-Cookie', [`accessToken=${token}; Path=/; SameSite`]);
    return res.send({ accessToken: token });
}

export default apiHandler(handleAccessToken, ['csrf', 'jwt']);