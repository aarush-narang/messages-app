import { apiHandler } from "../../../../../lib/helpers/api-handler"

async function handleAccessToken(req, res) {
    console.log(req.token)
    return res.json({ accessToken: req.token })
}

export default apiHandler(handleAccessToken)