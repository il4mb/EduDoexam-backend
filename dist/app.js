import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dynamicRouter from "./systems/dynamicRouting.js";
const app = express();
// import middleware from './utils/middleware';
app.use(cors());
app.use(cookieParser());
// app.use(middleware.requestLogger)
app.use(express.json());
// app.use(middleware.tokenExtractor);
app.use(dynamicRouter);
// app.use('/api/auth', authRouters);
// app.use('/api/product', productRouters);
// app.use('/api/profile', profileRouters);
// app.use('/api/exams', examsRouters);
// app.use('/api/classes', classesRouters)
// app.use(middleware.unknownEndpoint);
// app.use(middleware.errorHandler);
export default app;
