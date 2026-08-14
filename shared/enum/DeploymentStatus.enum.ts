export enum DeploymentStatus {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed"
}

export type DeploymentStatusType = (typeof DeploymentStatus)[keyof typeof DeploymentStatus];