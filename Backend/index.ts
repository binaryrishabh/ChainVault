import express from "express";
const app = express();
import cors from "cors";
import { prisma } from "./lib/prisma";
import { IdSchema, InfrastructureSchema, UpdateInfrastructureSchema } from "./zod_schemas/InfrastructureSchema.schema";
import { errorHandler } from "./utils/middleware";
import { ValidationError, NotFoundError } from "./utils/errors";
import { config } from "./utils/config";
import { rateLimiter } from "./utils/rateLimiter";
import { deploymentQueue } from "./infra/queue";

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


/* The infra CRUD code */
app.post("/api/infrastructure", async(req, res) => {
    const infrastructureResult = InfrastructureSchema.safeParse(req.body);

    if(!infrastructureResult.success) {
        const errorMessages = infrastructureResult.error.issues.map(err => err.message).join(", ");
        throw new ValidationError(errorMessages);
    }

    const { name, layout } = infrastructureResult.data;

    const createdInfrastructure = await prisma.infrastructure.create({
        data: {
            name,
            layout: layout || {}
        }
    })

    res.status(201).json({
        success: true,
        message: "The infrastructure created successfully",
        createdInfrastructure
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

// delete all end point
app.delete("/api/infrastructure", async(req, res) => {
  const allDeletedInfrastructure = await prisma.infrastructure.deleteMany();

  if(allDeletedInfrastructure.count === 0) {
    throw new NotFoundError("No infrastructure found to delete");
  }

  res.status(200).json({
      success: true,
      message: "Get all infrastructure",
      allDeletedInfrastructure
  });
  return;
})


app.post("/api/test-deploy", async(req, res) => {
  await deploymentQueue.add("test-deployment", {
    deploymentId: "test-123",
    resources: ["vm", "database"]
  });
  res.status(200).json({
    message: "Job added to queue"
  })
})

app.use(errorHandler)

app.listen(config.PORT);
