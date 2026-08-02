import type { Request, Response, NextFunction } from "express";

const MAX_REQUESTS = 100;
const WINDOW_MAX_SIZE = 15 * 60 * 1000; // 15 minutes

const ipMap = new Map<string, { count: number; resetTime: number }>();

// Rate limiting algorithm: Fixed Window Counter
// Per IP: 100 requests per 15-minute window
// Resets when window expires
export const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    console.log(ip);
    

    const now = Date.now();

    const entry = ipMap.get(ip);

    if(req.path === "/health") {
        next();
        return;
    }
    
    if(!entry || entry.resetTime < now) { // ip not exists or window time has past so reset
        ipMap.set(ip, { count: 1, resetTime: now + WINDOW_MAX_SIZE })
        res.setHeader("X-RateLimit-Limit", MAX_REQUESTS);
        res.setHeader("X-RateLimit-Remaining", MAX_REQUESTS - 1);
        res.setHeader("X-RateLimit-Reset", now + WINDOW_MAX_SIZE);
        next();
        return;
    }
    else if(entry && entry.resetTime > now && entry.count < MAX_REQUESTS) { // within window and count is also valid
        entry.count += 1;
        res.setHeader("X-RateLimit-Limit", MAX_REQUESTS);
        res.setHeader("X-RateLimit-Remaining", MAX_REQUESTS - entry.count);
        res.setHeader("X-RateLimit-Reset", entry.resetTime);
        next();
        return;
    }
    else { // if ip exists && reset time >= now &&  count > MAX_REQUESTS: reject as already filled
        res.setHeader("X-RateLimit-Limit", MAX_REQUESTS);
        res.setHeader("X-RateLimit-Remaining", 0);
        res.setHeader("Retry-After", Math.ceil((entry.resetTime - now) / 1000)) // in minutes
        res.setHeader("X-RateLimit-Reset", entry.resetTime);
        res.status(429).json({
            success: false,
            message: "Too many requests"
        })
        return;
    }
}