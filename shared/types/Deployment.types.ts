import type { ChaosEvents } from "./ChaosEvents.types";
import type { Stages } from "./Stages.types";
import type { Timeline } from "./Timeline.types";

export interface Deployment {
  id: string,
  infrastructureId: string,
  status: string,
  resourceCount: number,
  stages: Stages[],
  timeline: Timeline[],
  chaosEvents: ChaosEvents[],
  createdAt: string,
  updatedAt: string
}