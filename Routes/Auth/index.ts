import { getUser, login, logout, refreshToken, register, resetPassword } from "../../Controllers/Auth";
import { loginValidator, refreshTokenValidator, signupValidator, verifyToken } from "../../Middlewares/Auth";

const express = require('express');

const app = express.Router();

app.post("/register", signupValidator, register);
app.post("/login", loginValidator, login);
app.post("/logout", verifyToken, logout);
app.post("/refresh", refreshTokenValidator, refreshToken);
app.get("/user", verifyToken, getUser);
app.post("/reset", verifyToken, resetPassword);

export default app;