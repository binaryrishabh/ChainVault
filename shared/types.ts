export interface Resource {
  id: string;
  type: string;
  emoji: string;
  x: number;
  y: number;
  public?: boolean;
  encryption?: boolean;
  openPorts?: number[];
  size?: "small" | "medium" | "large";
  region?: string;
  name?: string;
}

export interface StageResult {
  status: "passed" | "warning" | "failed";
  summary: string;
  details: Record<string, any>;
}

export interface DeploymentJob {
  deploymentId: string;
  resources: Resource[];
}