export const DEPLOYMENT_STAGES = [
  "Validate",
  "Provision",
  "Configure",
  "Orchestrate",
  "HealthCheck",
  "SecurityScan",
  "CostEstimate",
  "MonitorSetup",
  "Ready"
] as const; // This tells to typescript that this array is readOnly and vakue are exact literals not just string[]. Without as const, the type is string[]. With it, the type is readonly ["Validate", "Provision", "Configure"].

export type DeploymentStageType = (typeof DEPLOYMENT_STAGES)[number];

export enum PUBLISH {
  publishOutboxFailed = "outbox-BullMQ-push-failed",
  publishDeploymentStarted = "deployment-started",
  publishStageCompleted = "stage-of-deployment-completed",
  publishDeploymentCompleted = "deployment-completed",
  publishDeploymentFailed = "deployment-failed"
}

export type PUBLISH_TYPE = typeof PUBLISH;

export enum DEPLOYMENT_STATUS {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed"
}

export type DEPLOYMENT_STATUS_TYPE = typeof DEPLOYMENT_STATUS;

export enum OUTBOX_BullMQ_STATUS {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed"
}

export type OUTBOX_BullMQ_STATUS_TYPE = typeof OUTBOX_BullMQ_STATUS;