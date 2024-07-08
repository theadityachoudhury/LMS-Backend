import nodemailer from 'nodemailer'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { compile } from 'handlebars'
import config from '../Config'

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SENDER_NAME } = config
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: true,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
})

const sendMail = async (
  to: string,
  subject: string,
  template: string,
  data: any,
  retries = 3,
) => {
  let attempt = 0
  while (attempt < retries) {
    try {
      const html = compile(
        readFileSync(
          resolve(__dirname, `../Templates/${template}.hbs`),
          'utf8',
        ),
      )(data)
      await transporter.sendMail({
        from: `${SMTP_SENDER_NAME} <${SMTP_USER}>`,
        to,
        subject,
        html,
      })
      return // Exit function if email sent successfully
    } catch (error) {
      attempt++
      console.error(
        `Attempt ${attempt} failed to send email to ${to}: ${error}`,
      )
      if (attempt < retries) {
        console.log(`Retrying after 3 seconds...`)
        await new Promise(resolve => setTimeout(resolve, 3000)) // Wait for 3 seconds before retrying
      } else {
        console.error(`All ${retries} attempts failed to send email to ${to}.`)
        throw new Error(`Failed to send email to ${to}`)
      }
    }
  }
}

export const serverStartMail = async (to: string) => {
  try {
    await sendMail(to, 'Server started', 'serverStart', {})
  } catch (error) {
    console.error(`Failed to send server start email to ${to}: ${error}`)
    throw error
  }
}

export const sendOtpMail = async (to: string, otp: string, name: string) => {
  try {
    await sendMail(to, 'OTP for your account', 'otp', { otp, name })
  } catch (error) {
    console.error(`Failed to send OTP email to ${to}: ${error}`)
    throw error
  }
}

export const sendWelcomeMail = async (to: string, name: string) => {
  try {
    await sendMail(to, 'Welcome to our platform', 'welcome', {
      name,
      verify_link: 'https://lms.adityachoudhury.com/verify/',
      support_link: 'https://lms.adityachoudhury.com/support',
      manage_notifications_link: `https://lms.adityachoudhury.com/manage-notifications/${to}`,
    })
  } catch (error) {
    console.error(`Failed to send welcome email to ${to}: ${error}`)
    throw error
  }
}
