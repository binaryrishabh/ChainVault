import { Resource } from "./Resource.types";

export interface OutboxPayload {
  deploymentId: string;
  infrastructureId?: string;
  resources?: Resource[];
  chaosType?: string;
  resourceId?: string;
  message?: string;
}