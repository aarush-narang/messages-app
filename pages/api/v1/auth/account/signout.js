import { apiHandler } from '../../../../../lib/helpers/api-handler'
import { QueryUser, UpdateUser } from '../../../../../lib/mongo'


export async function signout(req, res) {
    if (req.method !== 'POST') return res.status(405).send(`Method ${req.method} Not Allowed`)
    
    const { user } = req
    const dbUser = await QueryUser({ user: { uid: user.uid, token: user.token } })
    const refreshTokens = dbUser.refreshTokens
    const newRefreshTokens = refreshTokens.filter(refreshToken => refreshToken.token !== req.body.token)
    await UpdateUser({ user, newData: { refreshTokens: newRefreshTokens } }) // remove refresh token (make more dynamic for multiple sessions)
    
    return res.status(200).send({ message: 'SUCCESS' })
    
}

export default apiHandler(signout);