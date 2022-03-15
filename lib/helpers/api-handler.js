import { jwtMiddleware } from './jwt-middleware';
import { errorHandler } from './error-handler';
import { cors, csrf } from '../middleware';

export function apiHandler(handler) {
    return async (req, res) => {
        try {
            // global middleware
            await cors(req, res)
            await csrf(req, res)

            await jwtMiddleware(req, res);

            // route handler
            await handler(req, res);
        } catch (err) {
            // global error handler
            errorHandler(err, res);
        }
    }
}