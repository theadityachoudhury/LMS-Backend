import { getUser, login, logout, refreshToken, register, resetPassword } from '../../Controllers/Auth';
import { loginValidator, refreshTokenValidator, signupValidator, verifyToken } from '../../Middlewares/Auth';

import express from 'express';

const app = express.Router();

app.post('/register', signupValidator, register);
app.post('/login', loginValidator, login);
app.post('/logout', verifyToken as any, logout as any);
app.post('/refresh', refreshTokenValidator as any, refreshToken as any);
app.get('/user', verifyToken as any, getUser as any);
app.post('/reset', verifyToken as any, resetPassword as any);

export default app;
