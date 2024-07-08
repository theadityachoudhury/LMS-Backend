import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import config from './Config'
import cookieParser from 'cookie-parser'
import { startServer } from './Utils/startServer'
import consola from 'consola'
import { errorHandler, CustomError } from './Utils/errorHandler' // Adjust import for CustomError
import { responseHandler } from './Utils/responseHandler'
import { NOT_FOUND } from './Utils/responseMessages'
import Auth from './Routes/Auth'
import { detectDevice } from './Utils/detectDevice'
const app = express()
consola.wrapAll()

app.use(detectDevice as any)

// Request logger middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  consola.info({
    message: `Method: ${req.method}, URL: ${req.url}, IP: ${req.ip}`,
    badge: true,
  })
  // consola.info({ message: `Device: ${req.device.type}, UA: ${req.headers["user-agent"] || "Unkown"}`, badge: true });
  next()
  //useing res object without affecting any code to bypass the ts unused variable error
  res //this will not affect anything??
})

// CORS middleware
app.use(
  cors({
    credentials: true,
    origin: [config.FRONTEND_URL],
  }),
)

// Body parsers
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Cookie parser middleware
app.use(cookieParser())

// Example route
app.get('/', (req: Request, res: Response) => {
  if (req.query.error) {
    const err: CustomError = {
      name: 'CustomError',
      message: 'An error occurred',
      statusCode: 400,
      reason: 'Bad Request',
    }
    throw err
  }
  responseHandler(
    { status: 200, success: true, message: 'Hello, World!', data: null },
    req,
    res,
  )
})

app.get('/health', (req: Request, res: Response) => {
  responseHandler(
    { status: 200, success: true, message: 'Server is running', data: null },
    req,
    res,
  )
})

// Routes
app.use('/api/auth', Auth)

// Not found middleware
app.use(() => {
  const err: CustomError = {
    name: 'CustomError',
    message: NOT_FOUND,
    statusCode: 404,
    reason: 'Not Found',
  }
  throw err
})

// Error handling middleware
app.use((err: CustomError, req: Request, res: Response) => {
  errorHandler(err, req, res)
})

// Start server
startServer(app)
