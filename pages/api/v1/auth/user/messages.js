import { QueryUser } from "../../../../../lib/mongo"
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

    res.status(200).send({ messages: dbuser.messages });
}

/* 
    groups collection with message objects stored with the group id as the key. When loading a user's messages, 
    go through all the groups they are in and search this collection for the group ids and return the messages, decrypting client side.
    __________________________________________________________________________________________________________________________________
    
    gid1: {
        users: [uid1, uid2, ...],
        // NOTE: ALL MESSAGES ARE ENCRYPTED!
        messages: [
            {
                mID: mID1, // message id, unique and can be used to create a link to the message
                author: uid2, // uid of the author
                message: message, // encrypted message
                createdAt: Date.now(), // timestamp of when the message was created
                read: [uid1, ...], // users who have read the message (does not include the author)
                edited: false, // if the message has been edited
            },
            {
                mID: mID2,
                author: uid1,
                message: message,
                createdAt: Date.now(),
                read: [uid2, ...],
                edited: false,
            },
            ...
        ]
    },
*/

export default apiHandler(userInfoHandler);