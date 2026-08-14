import { Worker } from "bullmq";
import { redis } from "./infra/redis";
import { prisma } from "./lib/prisma";
import { deploymentQueue } from "./infra/queue";
import { publishChaosInjected, publishDeploymentCompleted, publishDeploymentFailed, publishDeploymentStarted, publishOutboxFailed, publishStageCompleted } from "./infra/pubsub";
import { runSecurityScan } from "./stages/securityScan.stages"
import { runCostEstimation } from "./stages/costEstimation.stages"
import { OutboxBullMQStatus } from "@shared/types/OutboxBullMQStatus.types";
import { DeploymentStatus } from "@shared/types/DeploymentStatus.types";
import { DEPLOYMENT_STAGES } from "@shared/constants/DEPLOYMENT_STAGES.constants";
import type { DeploymentJob } from "@shared/types/DeploymentJob.types";
import type { Deployment } from "@shared/types/Deployment.types";
import type { Stages } from "@shared/types/Stages.types";

// Outbox processor-> Polls the unprocessed events from outbox table every 5 seconds and adds to BullMQ.
// This is because we have implemented the atomicity in the /api/deployments api end-point code.
// This is polling to the database server every 5 seconds. But at production shift to switch to CDC with Debezium and Kafka.

// Wait 5s for Redis connection to establish before polling outbox
await new Promise(r => setTimeout(r, 5000));

/*
  OUTBOX PROCESSOR
  Polls the outbox table every 5 seconds. Processes pending entries.
  
  Two delivery paths:
    1. "deployment-created"  →  BullMQ queue  →  Worker processes 7 stages
    2. "chaos-injected"      →  Redis Pub/Sub  →  WebSocket clients directly
  
  Why: Chaos events don't need BullMQ processing. They just need real-time
  notification. Skipping BullMQ reduces latency and keeps the queue clean.
  
  Later Production upgrade path: Replace polling with CDC (Debezium + Kafka).
*/
setInterval(async () => {
  try {
    // 1. FETCH — Get up to 10 unprocessed entries, ordered by fewest retries first
    const unprocessed = await prisma.outbox.findMany({
      where: {
        status: OutboxBullMQStatus.PENDING,
        retries: { lt: 4 }  // Must match maxRetries in Outbox model
      },
      orderBy: [
        { retries: "asc" },    // Entries with fewest retries get priority
        { createdAt: "asc" }   // Older entries first
      ],
      take: 10
    });

    // 2. PROCESS — Handle each entry
    for (const entry of unprocessed) {
      // 2a. Mark as processing (prevents duplicate picks if we scale to multiple pollers)
      await prisma.outbox.update({
        where: { id: entry.id },
        data: { status: OutboxBullMQStatus.PROCESSING }
      });

      try {
        // 2b. DELIVER — Route based on event type
        if (entry.eventType === "chaos-injected") {
          // Chaos events: publish directly to Redis Pub/Sub.
          // No BullMQ needed — just real-time notification.
          await publishChaosInjected(entry);
        } else {
          // Deployment events: add to BullMQ queue for worker processing.
          // jobId = deploymentId ensures idempotency — duplicates are ignored.
          await deploymentQueue.add(entry.eventType, entry.payload, {
            jobId: (entry.payload as any).deploymentId
          });
        }

        // 2c. Mark as completed — delivery succeeded
        await prisma.outbox.update({
          where: { id: entry.id },
          data: {
            status: OutboxBullMQStatus.COMPLETED,
            processedAt: new Date()
          }
        });

      } catch (err: any) {
        // 2d. DELIVERY FAILED — Retry or abandon
        
        const newRetries = entry.retries + 1;
        const isFailed = newRetries >= entry.maxRetries;

        // Update retry count and status
        await prisma.outbox.update({
          where: { id: entry.id },
          data: {
            status: isFailed ? OutboxBullMQStatus.FAILED : OutboxBullMQStatus.PENDING,
            retries: newRetries,
            error: err.message
          }
        });

        // If permanently failed, mark deployment as failed and notify
        if (isFailed) {
          await prisma.deployment.update({
            where: { id: (entry.payload as any).deploymentId },
            data: { status: DeploymentStatus.FAILED }
          });

          await publishOutboxFailed(
            (entry.payload as any).deploymentId,
            "Outbox delivery exhausted all retries."
          );

          console.error(
            `Outbox ${entry.id} | deployment ${(entry.payload as any).deploymentId} | PERMANENTLY FAILED | ${err.message}`
          );
        } else {
          console.error(
            `Outbox ${entry.id} | deployment ${(entry.payload as any).deploymentId} | Retry ${newRetries}/${entry.maxRetries} | ${err.message}`
          );
        }
      }
    }
  } catch (err: any) {
    // Outer catch — errors here don't crash the poller. Next interval retries.
    console.error(`Outbox poller error: ${err.message}`);
  }
}, 5000);


const worker = new Worker (
  "deployments", // Watches the "deploymets" queue
  async (job) => { // This function runs for every job
    // The 7 stage will go here
    const { deploymentId, resources } = job.data as DeploymentJob;

    try {
      // 1. Mark as running
      await prisma.deployment.update({
        where: {
          id: deploymentId,
        },
        data: {
          status: DeploymentStatus.RUNNING
        }
      });

      // Publish as current deployment has started running
      await publishDeploymentStarted(deploymentId, resources.length);
      console.log(`Deployment started ${deploymentId}`);

      
      // 2. Process each stage
      for(const stage of DEPLOYMENT_STAGES) { // DEPLOYMENT_STAGES This is from the global shared constants file
        // Read the deployment from DB for each stage so that we could prevent stale data if something else modified it.
        // 0. Ckeck if this stage is already completed(idempotency)
        const currentDeployment = await prisma.deployment.findUnique({
          where: {
            id: deploymentId
          }
        });

        if(!currentDeployment) {
          console.error(`Deployment ${deploymentId} not found in DB. Skipping stage.`);
          return;
        }

        const existingStages: Stages[] = (currentDeployment?.stages as any) || [];
        // Find which all existing changes already completed so that u can skip...
        const alreadyDone = existingStages.some(existingStage => existingStage.name === stage && existingStage.status === "completed");

        // Skip if already done
        if(alreadyDone) {
          console.log(`${stage} already completed. Skipping.`);
          continue;
        }

        // Simulate work
        let stateMessage = "";

        switch(stage) {
          case "SecurityScan":
            const securityResult = runSecurityScan(resources);
            stateMessage = securityResult.summary;
            break;
          case "CostEstimate":
            const costResult = runCostEstimation(resources);
            stateMessage = costResult.summary;
            break;
          default:
            stateMessage = `${stage} completed for ${resources.length} resources`;  
        }

        const startedAt = new Date().toISOString();
        
        await new Promise(waitHere => setTimeout(waitHere, 2000)); // Wait here for 2 seconds between each stage


        // Add stage entry for current stage which will get updated to db finally
        const currentStages = (currentDeployment?.stages as any[]) || [];

        currentStages.push({
          name: stage,
          status: "completed",
          startedAt,
          completedAt: new Date().toISOString(),
          message: stateMessage
        });

        // Add timeline entry for current stage which will get updated to db finally
        const currentTimeline = (currentDeployment?.timeline as any[]) || [];
        currentTimeline.push({
          timestamp: new Date().toISOString(),
          event: stage,
          message: stateMessage
        });

        // Update DB
        // Keep updating stages and timeline in db for each stage
        await prisma.deployment.update({
          where: {
            id: deploymentId
          },
          data: {
            stages: currentStages,
            timeline: currentTimeline
          }
        });

        // Publish as current stage is completed.
        await publishStageCompleted(deploymentId, stage, resources.length, stateMessage);

        console.log(`${stage} completed for deployment id: ${deploymentId}`);
      }

      // 3. Mark as completed
      // Update the status in the db as completed for this deployment
      await prisma.deployment.update({
        where: {
          id: deploymentId
        },
        data: {
          status: DeploymentStatus.COMPLETED
        }
      });

      // broadcasts to Redis pub/sub. Websocket server will forward it to frontend.
      // Publish that current deployment finished and completed
      await publishDeploymentCompleted( deploymentId );

      console.log(`Deployment completed ${deploymentId}`);
    }
    catch (err: any) {
      await prisma.deployment.update({
        where: {
          id: deploymentId
        },
        data: {
          status: DeploymentStatus.FAILED
        }
      });

      // Publish that current deployment failed....
      await publishDeploymentFailed( deploymentId, `Deployment failed at some stage due to: ${err.message}`);
    }
  },
  { 
    connection: redis
  }
)