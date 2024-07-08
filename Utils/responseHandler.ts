import { Request, Response } from 'express'

interface ApiResponse {
  status: number
  success: boolean
  message: string
  data: any | null
}

export const responseHandler = (
  data: ApiResponse,
  req: Request,
  res: Response,
) => {
  res.status(200).json(data)
  req
}
