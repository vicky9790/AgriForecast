import dotenv from "dotenv";
import { SignOptions } from "jsonwebtoken";

dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 5000,

  nodeEnv: process.env.NODE_ENV || "development",

  databaseUrl: process.env.DATABASE_URL || "",

  jwtSecret: process.env.JWT_SECRET || "change-this-secret",

  jwtExpiresIn: (
    process.env.JWT_EXPIRES_IN || "7d"
  ) as SignOptions["expiresIn"],

  aiServiceUrl: process.env.AI_SERVICE_URL || "http://localhost:8000",

  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
};