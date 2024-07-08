import { Response, NextFunction } from 'express';
import { customRequest } from '../Typings';
import UAParser from 'ua-parser-js';

export const detectDevice = (req: customRequest, res: Response, next: NextFunction) => {
    const parser = new UAParser();
    const ua = req.headers['user-agent'] || ''; // Provide a default empty string if undefined
    const result = parser.setUA(ua).getResult();

    req.device = {
        type: result.device.type || 'desktop', // default to 'desktop' if type is not detected
        name: result.device.model || 'unknown', // default to 'unknown' if model is not detected
    };

    next();
};
