import { Queue } from "bullmq";
import { redis } from "./redis";

export const deploymentQueue = new Queue("deployments", {
  connection: redis
});