import Config from "../Config";
import consola from "consola";
import { Application } from "express";
import { createServer } from "http";

export const startServer = async (app: Application) => {
	const server = createServer(app);
	const port = Config.PORT || 5000;
	server.listen(port, () => {
		consola.success({
			message: `Server is running at http://localhost:${port}`,
			badge: true,
		});
	});
};