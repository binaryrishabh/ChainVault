import Redis from "ioredis";

export const redis = new Redis({
  host: "localhost", //  Docker container is accessible at localhost
  port: 6379, // Default Redis port mapped to docker run command
  maxRetriesPerRequest: null // BullMQ needs this. Without it, BullMQ throws errors on retry.
})