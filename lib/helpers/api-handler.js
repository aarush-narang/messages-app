import { jwtMiddleware } from './jwt-middleware';
import { errorHandler } from './error-handler';
import { cors, csrf } from '../middleware';

export function apiHandler(handler, middlewares = ['cors', 'jwt', 'csrf']) {
    return async (req, res) => {
        try {
            // global middleware
            if (middlewares.includes('cors')) {
                await cors(req, res);
            }
            if (middlewares.includes('jwt')) {
                await jwtMiddleware(req, res);
            }
            if (middlewares.includes('csrf')) {
                await csrf(req, res);
            }

            // route handler
            await handler(req, res);
        } catch (err) {
            // global error handler
            errorHandler(err, res);
        }
    }
}