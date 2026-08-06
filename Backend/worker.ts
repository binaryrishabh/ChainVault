import { Worker } from "bullmq";
import { redis } from "./infra/redis";

const worker = new Worker (
  "deployments", // Watches the "deploymets" queue
  async (job) => { // This function runs for every job
    console.log("Processing deployment:"+ job.data.deploymentId);
    // The 7 stage will go here
  },
  { connection: redis }
)