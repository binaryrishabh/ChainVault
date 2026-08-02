import express from "express";
const app = express();
import cors from "cors";
import { prisma } from "./lib/prisma";
import { IdSchema, InfrastructureSchema, UpdateInfrastructureSchema } from "./Schemas/InfrastructureSchema.schema";
import { errorHandler } from "./utils/middleware";
import { ValidationError, NotFoundError } from "./utils/errors";
import { config } from "./utils/config";
import { rateLimiter } from "./utils/rateLimiter";

app.use(rateLimiter);
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
    res.status(200).json({
        success: true,
        status: "ok",
        uptime: process.uptime(), // seconds since server started
        timestamp: new Date().toISOString() // current server time
    })
})

app.post("/api/infrastructure", async(req, res) => {
    const infrastructureResult = InfrastructureSchema.safeParse(req.body);

    if(!infrastructureResult.success) {
        const errorMessages = infrastructureResult.error.issues.map(err => err.message).join(", ");
        throw new ValidationError(errorMessages);
    }

    const { name, layout } = infrastructureResult.data;

    const infrastructureCreated = await prisma.infrastructure.create({
        data: {
            name,
            layout: layout || {}
        }
    })

    res.status(201).json({
        success: true,
        message: "The infrastructure created successfully",
        infrastructureCreated
    })
    return;
});

app.get("/api/infrastructure/:id", async(req, res) => {
    const idResult = IdSchema.safeParse(req.params)

    if(!idResult.success) {
        const errorMessages = idResult.error.issues.map(err => err.message).join(", ");
        throw new ValidationError(errorMessages);
    }

    const { id } = idResult.data;

    const infrastructure = await prisma.infrastructure.findUnique({
        where: {
            id
        }
    })

    if(!infrastructure) {
        throw new NotFoundError("Infrastructure not found with the given id");
    }

    res.status(200).json({
        success: true,
        message: "The infrastructure successfully fetched",
        infrastructure
    })
    return;
})

app.get("/api/infrastructure", async(req, res) => {
    const allInfrastructure = await prisma.infrastructure.findMany({
        orderBy: {
            createdAt: "desc"
        }
    })

    if(allInfrastructure.length === 0) {
        throw new NotFoundError("No Infrastructure created yet");
    }

    res.status(200).json({
        success: true,
        message: "Get all infrastructure",
        allInfrastructure
    });
    return;
})

app.put("/api/infrastructure/:id", async(req, res) => {
    const idResult = IdSchema.safeParse(req.params);

    if(!idResult.success) {
        const errorMessages = idResult.error.issues.map(err => err.message).join(", ");
        throw new ValidationError(errorMessages);
    }

    const { id } = idResult.data;


    const infrastructureResult = UpdateInfrastructureSchema.safeParse(req.body);
    
    if(!infrastructureResult.success) {
        const errorMessages = infrastructureResult.error.issues.map(err => err.message).join(", ");
        throw new ValidationError(errorMessages);
    }

    const updatedInfrastructure = await prisma.infrastructure.update({
        where: {
            id
        },
        data: infrastructureResult.data
    })

    res.status(200).json({
        success: true,
        message: "Infrastructure successfully updated",
        updatedInfrastructure
    })
    return;
})

app.delete("/api/infrastructure/:id", async(req, res) => {
    const idResult = IdSchema.safeParse(req.params);

    if(!idResult.success) {
        const errorMessages = idResult.error.issues.map(err => err.message).join(", ");
        throw new ValidationError(errorMessages);
    }

    const { id } = idResult.data;

    const deletedInfrastructure = await prisma.infrastructure.delete({
        where: {
            id
        }
    })

    return res.status(200).json({
        success: true,
        message: "Infrastructure deleted successfully!",
        deletedInfrastructure
    })
})

app.use(errorHandler)

app.listen(config.PORT);