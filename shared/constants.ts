export const DEPLOYMENT_STAGES = [
  "Validate",
  "Provision",
  "Configure",
  "Orchestrate",
  "HealthCheck",
  "MonitorSetup",
  "Ready"
] as const; // This tells to typescript that this array is readOnly and vakue are exact literals not just string[]. Without as const, the type is string[]. With it, the type is readonly ["Validate", "Provision", "Configure"].

export type DeploymentStage = (typeof DEPLOYMENT_STAGES)[number];

export enum PUBLISH_TYPE {
  publishOutboxFailed = "outbox-BullMQ-push-failed",
  publishDeploymentStarted = "deployment-started",
  publishStageCompleted = "stage-of-deployment-completed",
  publishDeploymentCompleted = "deployment-completed",
  publishDeploymentFailed = "deployment-failed"
}

export type PUBLISHTYPE = typeof PUBLISH_TYPE;

export enum DEPLOYMENT_STATUS {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed"
}

export type DEPLOYMENTSTAGES = typeof DEPLOYMENT_STATUS;

export enum OUTBOX_BullMQ_STATUS {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed"
}

export type OUTBOXBullMQSTATUS = typeof OUTBOX_BullMQ_STATUS;