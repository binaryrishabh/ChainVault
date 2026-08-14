export enum Publish {
  publishChaosInjected = "chaos-injected",
  publishOutboxFailed = "outbox-BullMQ-push-failed",
  publishDeploymentStarted = "deployment-started",
  publishStageCompleted = "stage-of-deployment-completed",
  publishDeploymentCompleted = "deployment-completed",
  publishDeploymentFailed = "deployment-failed"
}

export type PublishType = (typeof Publish)[keyof typeof Publish];