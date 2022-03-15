import csurf from 'csurf'
import Cors from 'cors'

// Helper method to wait for a middleware to execute before continuing
// And to throw an error when an error happens in a middleware
export function runMiddleware(middleware) {
    return (req, res) =>
        new Promise((resolve, reject) => {
            middleware(req, res, (result) => {
                if (result instanceof Error) {
                    return reject(result)
                }
                return resolve(result)
            })
        })
}
export function csrf(req, res) {
    return runMiddleware(csurf({ cookie: true }))(req, res)
}

/**
 * @param {Request} req 
 * @param {Response} res 
 * @param {Cors.CorsOptions} options 
 */
export function cors(req, res, options = {}) {
    return runMiddleware(Cors(options))(req, res)
}

export default runMiddleware