// Utils/errorHandler.ts

import { Request, Response } from 'express'
import consola from 'consola'
import { SERVER_ERROR } from './responseMessages'

export interface CustomError extends Error {
  statusCode: number
  reason: string
}

export const errorHandler = (err: CustomError, req: Request, res: Response) => {
  consola.error('Stack Trace:- ', err.stack) // Log the error stack trace for debugging

  // Determine the status code based on the error type
  const statusCode = err.statusCode || 500
  const reason = err.reason || SERVER_ERROR
  const message = err.message || SERVER_ERROR

  // Send the response
  res.status(200).json({
    status: statusCode,
    success: false,
    reason: reason,
    message: message,
    data: null,
  })
  req
}
