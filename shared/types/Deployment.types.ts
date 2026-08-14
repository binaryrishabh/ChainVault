import type { ChaosEvents } from "./ChaosEvents.types";
import type { DeploymentStages } from "./DeploymentStages.types";
import type { DeploymentStatus } from "../enum/DeploymentStatus.enum";
import type { DeploymentTimeline } from "./DeploymentTimeline.types";

export interface Deployment {
  id: string,
  infrastructureId: string,
  status: DeploymentStatus,
  resourceCount: number,
  stages: DeploymentStages[],
  timeline: DeploymentTimeline[],
  chaosEvents: ChaosEvents[],
  createdAt: string,
  updatedAt: string
}