export enum DeploymentTimelineEventNames {
  DeploymentStarted = "Deployment Started",
  DeploymentCompleted = "Deployment Completed",
  DeploymentFailed = "Deployment Failed",
  OutboxFailed = "Outbox Failed",
  ChaosInjected = "Chaos Injected"
}

export type DeploymentTimelineEventNamesType = (typeof  DeploymentTimelineEventNames)[keyof typeof  DeploymentTimelineEventNames];