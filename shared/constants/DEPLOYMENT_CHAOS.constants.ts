export const DEPLOYMENT_CHAOS = [
  "crash",
  "network-delay",
  "cpu-spike",
  "memory-leak",
  "disk-failure"
] as const;

export type DeploymentChaosType = (typeof DEPLOYMENT_CHAOS)[number];