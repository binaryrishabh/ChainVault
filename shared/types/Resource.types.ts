import type { ResourceType } from "../constants/RESOURCE_TYPES.constants";

export interface Resource {
  id: string;
  type: ResourceType; // "Virtual Machine", 'Database' — the KIND of resource
  x: number;
  y: number;
  public?: boolean;
  encryption?: boolean;
  openPorts?: number[];
  size?: "small" | "medium" | "large";
  region?: string;
  name?: string; // User-given name like "Main DB", "Prod DB"
}