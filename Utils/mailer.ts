import nodemailer from "nodemailer";
import Config from "../Config";

const { SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_HOST, SMTP_SENDER_NAME } = Config;

const sendMailWithRetry = async (transporter: any, message: any, retries: number = 3, delay: number = 1000) => {
	for (let attempt = 1; attempt <= retries; attempt++) {
		try {
			let info = await transporter.sendMail(message);
			return info;
		} catch (error) {
			if (attempt < retries) {
				console.error(`Attempt ${attempt} to send email failed. Retrying in ${delay} ms...`);
				await new Promise(res => setTimeout(res, delay));
				delay *= 2; // Exponential backoff
			} else {
				console.error(`All ${retries} attempts to send email failed.`);
				throw error;
			}
		}
	}
};

export const mailer = async (
	to: any,
	subject: string,
	hbody: string,
	userId: string,
	type: string
) => {
	const transporter = nodemailer.createTransport({
		host: SMTP_HOST,
		port: SMTP_PORT,
		secure: true,
		auth: {
			user: SMTP_USER,
			pass: SMTP_PASS,
		},
	});
	if (!Array.isArray(to)) {
		to = [to];
	}

	let message = {
		from: `${SMTP_SENDER_NAME} <${SMTP_USER}>`, // sender address
		to: to.join(", "), // List of receivers, join the array into a comma-separated string
		subject: subject, // Subject line
		html: hbody, // html body
	};

	try {
		await sendMailWithRetry(transporter, message);
	} catch (error) {
		console.error('Failed to send email:', error);
	}
};
