import express from "express";
const app = express();
import cors from "cors";
import { prisma } from "./lib/prisma";
import crypto from "crypto";
import { errorHandler } from "./utils/middleware";
import { ValidationError, NotFoundError } from "./utils/errors";
import { config } from "./utils/config";
import { rateLimiter } from "./utils/rateLimiter";
import { deploymentQueue } from "./infra/queue";
import { InfrastructureIdSchema, InfrastructureBodySchema, UpdateInfrastructureBodySchema } from "./zod_schemas/infrastructure.schema";
import { ChaosInjectionBodySchema, DeploymentIdSchema } from "./zod_schemas/deployment.schema";
import { validateDeploymentReadiness } from "@shared/validateConnectionRules";

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


/* -----------------The Infra CRUD code---------------------- */
app.post("/api/infrastructure", async(req, res) => {
    const infrastructureResult = InfrastructureBodySchema.safeParse(req.body);

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

app.get("/api/infrastructure/:infrastructureId", async(req, res) => {
  const InfrastructureId = InfrastructureIdSchema.safeParse(req.params)

  if(!InfrastructureId.success) {
    const errorMessages = InfrastructureId.error.issues.map(err => err.message).join(", ");
    throw new ValidationError(errorMessages);
  }

  const { infrastructureId } = InfrastructureId.data;

  const infrastructure = await prisma.infrastructure.findUnique({
    where: {
        id: infrastructureId
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

app.put("/api/infrastructure/:infrastructureId", async(req, res) => {
    const InfrastructureId = InfrastructureIdSchema.safeParse(req.params);

    if(!InfrastructureId.success) {
        const errorMessages = InfrastructureId.error.issues.map(err => err.message).join(", ");
        throw new ValidationError(errorMessages);
    }

    const { infrastructureId } = InfrastructureId.data;


    const infrastructureResult = UpdateInfrastructureBodySchema.safeParse(req.body);
    
    if(!infrastructureResult.success) {
        const errorMessages = infrastructureResult.error.issues.map(err => err.message).join(", ");
        throw new ValidationError(errorMessages);
    }

    const updatedInfrastructure = await prisma.infrastructure.update({
        where: {
            id: infrastructureId
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

app.delete("/api/infrastructure/:infrastructureId", async(req, res) => {
  const InfrastructureId = InfrastructureIdSchema.safeParse(req.params);

  if(!InfrastructureId.success) {
      const errorMessages = InfrastructureId.error.issues.map(err => err.message).join(", ");
      throw new ValidationError(errorMessages);
  }

  const { infrastructureId } = InfrastructureId.data;

  const deletedInfrastructure = await prisma.infrastructure.delete({
      where: {
          id: infrastructureId
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



/* -----------------The Deployment CRUD code---------------------- */
// Create new deployment
app.post("/api/deployments", async(req, res) => {
  const InfrastructureId = InfrastructureIdSchema.safeParse(req.body);
  

  if(!InfrastructureId.success) {
    const errorMessages = InfrastructureId.error.issues.map(err => err.message).join(", ");
    throw new ValidationError(errorMessages);
  }

  const { infrastructureId } = InfrastructureId.data;

  const infrastructure = await prisma.infrastructure.findUnique({
    where: {
      id: infrastructureId
    }
  })

  if(!infrastructure) {
    throw new NotFoundError("Infrastructue not found with the given id.");
  }

  const resources = (infrastructure.layout as any).resources || [];
  const resourceCount = resources.length;

  // Before deploying check the readiness of deployment as current resources could even be deployed or not.
  // const deploymentReadiness = validateDeploymentReadiness(resources);
  // if(!deploymentReadiness.valid) {
    
  //   throw new ValidationError("Cannot deploy:\n"+ deploymentReadiness.issues.join("\n"));
  // }

  // Generating a uuid on our own because we are implementing the atmoicity on deployment and outbox table so if we stay dependent on the id created by the postgres when the deployment gets stored then we have to update the deploymentId field of the outbox table later on seperately. But, by this we can put the deploymentId value for both of them within same transaction.
  const deploymentId = crypto.randomUUID();

  const [createdDeployment] = await prisma.$transaction([
    prisma.deployment.create({
      data: {
        id: deploymentId,
        infrastructureId,
        resourceCount
      }
    }),
    prisma.outbox.create ({
      data: {
        eventType: "deployment-created",
        payload: {
          deploymentId,
          resources
        }
      }
    })
  ]);

  // code to add deployemt to the BullMQ queue is there in the worker.ts file through outbox

  res.status(201).json({
    success: true,
    message: "The deployment created successfully",
    createdDeployment
  })
})

// Get dtails of existing deployment
app.get("/api/deployment/:deploymentId", async(req, res) => {
  const DeploymentId = DeploymentIdSchema.safeParse(req.params);

  if(!DeploymentId.success) {
    const errorMessages = DeploymentId.error.issues.map(err => err.message).join(", ");
    throw new ValidationError(errorMessages);
  }

  const { deploymentId } = DeploymentId.data;

  const deployment = await prisma.deployment.findUnique({
    where: {
      id: deploymentId
    }
  })

  if(!deployment) {
    throw new NotFoundError("No deployment with the specified id: "+ deploymentId);
  }

  res.status(200).json({
    success: true,
    message: "We have fetched the deployment successfully",
    deployment
  })
})

// Chaos Injection endpoint
app.post("/api/deployments/:deploymentId/chaos", async(req, res) => {
  const DeploymentId = DeploymentIdSchema.safeParse(req.params);

  if(!DeploymentId.success) {
    const errorMessages = DeploymentId.error.issues.map(err => err.message).join(", ");
    throw new ValidationError(errorMessages);
  }

  const ChaosInjectionData = ChaosInjectionBodySchema.safeParse(req.body);

  if(!ChaosInjectionData.success) {
    const errorMessages = ChaosInjectionData.error.issues.map(err => err.message).join(", ");
    throw new ValidationError(errorMessages);
  }

  const { deploymentId } = DeploymentId.data;
  const { type, resourceId } = ChaosInjectionData.data;

  // Validate deployment exists and is running
  const deployment = await prisma.deployment.findUnique({
    where: {
      id: deploymentId
    }
  })

  if(!deployment) {
    throw new NotFoundError("Deployemnt Not Found with specified id"+ deploymentId);
  }

  if(deployment.status !==  "running") {
    throw new ValidationError("Can only inject chaos into a running deployment");
  }

  // Add chaos event to deployment
  const currentChaosEvent = (deployment.chaosEvents as any) || [];
  currentChaosEvent.push({
    timeStamp: new Date().toISOString(),
    type,
    resourceId,
    message: `Chaos injected ${type} on ${resourceId}`
  })

  // Update into deployment row i.e. DB
  const [updatedDeploymentAfterChaosAdded] = await prisma.$transaction([
    prisma.deployment.update({
      where: {
        id: deploymentId
      },
      data: {
        chaosEvents: currentChaosEvent
      }
    }),
    prisma.outbox.create({ // It's default status is pending...
      data: {
        eventType: "chaos-injected",
        payload: {
          deploymentId,
          chaosType: type,
          resourceId,
          message: `Chaos ${type} injected on resource`
        }
      }
    })
  ])

  res.status(200).json({
    success: true,
    message: "Chaos injected",
    updatedDeploymentAfterChaosAdded
  })
})

// testing of adding resource to queue manually.
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