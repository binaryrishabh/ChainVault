import { Worker } from "bullmq";
import { redis } from "./infra/redis";
import { prisma } from "./lib/prisma";
import { deploymentQueue } from "./infra/queue";
import { publishDeploymentUpdate } from "./infra/pubsub";

// Outbox processor-> Polls the unprocessed events from outbox table every 5 seconds and adds to BullMQ.
// This is because we have implemented the atomicity in the /api/deployments api end-point code.
// This is polling to the database server every 5 seconds. But at production shift to switch to CDC with Debezium and Kafka.
setInterval( async() => {
  try {
    const unprocessed = await prisma.outbox.findMany({
      where: {
        status: "pending", // Only filter out pending.. Failed will never be retried
        // NOTE: maxRetries in Outbox model is 4. This lt: 4 must match.
        // If you change one, change both, the other in Oubox schema.
        retries: {
          lt: 4
        }
      },
      orderBy: [
        {
          retries: "asc"  // Pick retries with fewest retries first
        },
        {
          createdAt: "asc" // Pick them with oldest first
        }
      ],
      take: 10 // picks 10 at max from the find list every 5 seconds
    });

    // traversing to the lists of unprocessed deployments
    for(const entry of unprocessed) {
      // i. mark each unprocessed deployment as pending -> processing
      await prisma.outbox.update({
        where: {
          id: entry.id // Here it is outbox id
        },
        data: {
          status: "processing"
        }
      })
      
      // This is because to keep the atomicity i.e. either the outbox update failes or queue add failes the process will remain pending
      try {
        // ii.
        // adding the unprocessed deployments to the queue. First the queue picks it up processes it then only the below updation takes place of the outbox table with status "completed"
        await deploymentQueue.add(entry.eventType, entry.payload, {
          jobId: (entry.payload as any).deploymentId
        });

        // iii.
        // Update the deployment from processign -> completed
        await prisma.outbox.update({
          where: {
            id: entry.id
          },
          data: {
            status: "completed",
            processedAt: new Date()
          }
        })
      }
      catch (err: any) {
        // iv. Queue failed
        // Q: What if queue.add succeeds but outbox update to "completed" fails.
        // Outbox stays "processing". Next poll picks it up again.
        // Queue.add fires again but BullMQ ignores duplicate because jobId = deploymentId.
        // Outbox update retries and eventually succeeds. No duplicate jobs. No lost deployments.
        // This is at-least-once delivery with idempotent job dispatch.
        const newRetries = entry.retries + 1;
        const isFailed: boolean = newRetries >= entry.maxRetries;
        
        // Always update outbox — back to pending for retry, or failed if exhausted
        await prisma.outbox.update({
          where: {
            id: entry.id // This the outbox id
          },
          data: {
            status: isFailed ? "failed" : "pending",
            retries: newRetries,
            error: err.message
          }
        });
        
        // If permanently failed, update deployment and notify
        if(isFailed) {
          await prisma.deployment.update({
            where: {
              id: (entry.payload as any).deploymentId
            },
            data: {
              status: "failed"
            }
          })

          await publishDeploymentUpdate(
            (entry.payload as any).deploymentId,
            "failed",
            "failed",
            "Deployment failed: outbox processing exhausted retries the max limit was 4"
          );

          console.error(`Outbox ${entry.id} ${isFailed ? "permanently failed" : "will retry"}: ${err.message}`);
        }
        else {
          console.error(`Outbox ${entry.id} will retry (${newRetries}/${entry.maxRetries}): ${err.message}`);
        }
      }
    }
  }
  catch (err) {
    // errors are logged not thrown so that queue processor keeps running
    console.error("Outbox queue processor error: ", err);
  }
}, 5000)

const worker = new Worker (
  "deployments", // Watches the "deploymets" queue
  async (job) => { // This function runs for every job
    // The 7 stage will go here
    const { deploymentId, resources } = job.data;

    try {
      // 1. Mark as running
      await prisma.deployment.update({
        where: {
          id: deploymentId,
        },
        data: {
          status: "running"
        }
      });

      await publishDeploymentUpdate( deploymentId, "started", "running", `Deployment started with ${resources.length} resources`);

      // 2. Define the 7 stages
      const stages = [
        "Validate",
        "Provision",
        "Configure",
        "Orchestrate",
        "HealthCheck",
        "MonitorSetup",
        "Ready"
      ];

      // 3. Process each stage
      for(const stage of stages) {
        // Simulate work
        const startedAt = new Date().toISOString();
        
        await new Promise(waitHere => setTimeout(waitHere, 2000)); // Wait here for 2 seconds between each stage

        // Read the deployment from DB for each stage  so that we could prevent stale data if something else modified it.
        const deployment = await prisma.deployment.findUnique({
          where: {
            id: deploymentId
          }
        });

        // Add stage entry for current stage which will get updated to db finally
        const currentStages = (deployment?.stages as any[]) || [];
        currentStages.push({
          name: stage,
          status: "completed",
          startedAt,
          completedAt: new Date().toISOString(),
          message: `${stage} completed for ${resources.length} resources`
        });

        // Add timeline entry for current stage which will get updated to db finally
        const currentTimeline = (deployment?.timeline as any[]) || [];
        currentTimeline.push({
          timestamp: new Date().toISOString(),
          event: stage,
          message: `${stage} stage completed successfully`
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

        // Public real-time event
        await publishDeploymentUpdate( deploymentId, stage, "completed", `${stage} completed successfully`)

        console.log(`${stage} completed for deployment id: ${deploymentId}`);
      }
      
      // 4. Mark as completed
      // Update the status in the db as completed for this deployment
      await prisma.deployment.update({
        where: {
          id: deploymentId
        },
        data: {
          status: "completed"
        }
      });

      // broadcasts to Redis pub/sub. Websocket server will forward it to frontend.
      await publishDeploymentUpdate( deploymentId, "finished", "completed", `All stages is completed infrastructure is ready`);

      console.log(`Deployment completed ${deploymentId}`);
    }
    catch (err: any) {
      await prisma.deployment.update({
        where: {
          id: deploymentId
        },
        data: {
          status: "failed"
        }
      });

      await publishDeploymentUpdate( deploymentId, "failed", "failed", `Deployment failed: ${err.message}`)
    }
  },
  { 
    connection: redis
  }
)