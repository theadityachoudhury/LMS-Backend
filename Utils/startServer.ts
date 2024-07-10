import { Application } from 'express';
import { createServer } from 'http';
import config from '../Config';
import consola from 'consola';
import { serverStartMail } from './mailer';

export const startServer = async (app: Application) => {
    const server = createServer(app);
    const PORT = config.PORT || 8000;
    server.listen(PORT, () => {
        consola.success(`Server is running on http://localhost:${PORT}`);
        if (config.NODE_ENV === 'live') {
            serverStartMail('adityasubham03@gmail.com')
                .then(() => consola.success('Server start mail sent'))
                .catch((err) => consola.error(err));
        }
    });
};
