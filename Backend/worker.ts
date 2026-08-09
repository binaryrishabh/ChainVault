import { Worker } from "bullmq";
import { redis } from "./infra/redis";
import { prisma } from "./lib/prisma";
import { deploymentQueue } from "./infra/queue";
import { publishDeploymentCompleted, publishDeploymentFailed, publishDeploymentStarted, publishOutboxFailed, publishStageCompleted } from "./infra/pubsub";
import { OUTBOX_BullMQ_STATUS, DEPLOYMENT_STATUS, DEPLOYMENT_STAGES, PUBLISH_TYPE } from "../shared/constants";

// Outbox processor-> Polls the unprocessed events from outbox table every 5 seconds and adds to BullMQ.
// This is because we have implemented the atomicity in the /api/deployments api end-point code.
// This is polling to the database server every 5 seconds. But at production shift to switch to CDC with Debezium and Kafka.

await new Promise(r => setTimeout(r, 5000));

setInterval( async() => {
  try {
    const unprocessed = await prisma.outbox.findMany({
      where: {
        status: OUTBOX_BullMQ_STATUS.PENDING, // Only filter out pending.. Failed will never be retried
        // NOTE: maxRetries in Outbox model is 4. This lt: 4 must match.
        // If you change one, change both, the other in Oubox schema.
        retries: {
          lt: 4
        }
      },
      orderBy: [{
          retries: "asc"  // Pick retries with fewest retries first
        }, {
          createdAt: "asc" // Pick them with oldest first
      }],
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
          status: OUTBOX_BullMQ_STATUS.PROCESSING
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
            status: OUTBOX_BullMQ_STATUS.COMPLETED,
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
            status: isFailed ? OUTBOX_BullMQ_STATUS.FAILED : OUTBOX_BullMQ_STATUS.PENDING,
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
              status: DEPLOYMENT_STATUS.FAILED
            }
          })

          // Publish that current deployemt couldn't be inserted into queue. and retries also exhausted.
          await publishOutboxFailed(
            (entry.payload as any).deploymentId,
            "BullMQ failed to push the service."
          );

          console.error(`Outbox: ${entry.id} with deploymentId: ${(entry.payload as any).deploymentId} permanently failed: ${err.message}`);
        }
        else {
          console.error(`Outbox ${entry.id} with deploymentId: ${(entry.payload as any).deploymentId} will retry (${newRetries}/${entry.maxRetries} times max): ${err.message}`);
        }
      }
    }
  }
  catch (err: any) {
    // errors are logged not thrown so that queue processor keeps running
    console.error(`Outbox queue processor error: ${err.message}`);
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
          status: DEPLOYMENT_STATUS.RUNNING
        }
      });

      // Publish as current deployment has started running
      await publishDeploymentStarted(deploymentId, resources.length);
      console.log(`Deployment started ${deploymentId}`);

      
      // 2. Process each stage
      for(const stage of DEPLOYMENT_STAGES) { // DEPLOYMENT_STAGES This is from the global shared constants file
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

        // Publish as current stage is completed.
        await publishStageCompleted(deploymentId, stage, resources.length);

        console.log(`${stage} completed for deployment id: ${deploymentId}`);
      }

      // 3. Mark as completed
      // Update the status in the db as completed for this deployment
      await prisma.deployment.update({
        where: {
          id: deploymentId
        },
        data: {
          status: DEPLOYMENT_STATUS.COMPLETED
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
          status: DEPLOYMENT_STATUS.FAILED
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