import { type Request, type Response, type NextFunction } from "express";
import { Prisma } from "../lib/generated/prisma/client";
import { AppError } from "./errors"

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    if(err instanceof AppError) {
        res.status(err.statusCode).json({
            success: false,
            message: err.message
        })
        return;
    }

    if(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
        res.status(404).json({
            success: false,
            message: "Resource not found"
        })
        return;
    }

    console.error(err);

    return res.status(500).json({
        success: false,
        message: "Internal server error"
    })
}