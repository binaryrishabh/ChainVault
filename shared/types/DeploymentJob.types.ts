import { Resource } from "./Resource.types";

export interface DeploymentJob {
  deploymentId: string;
  resources: Resource[];
}