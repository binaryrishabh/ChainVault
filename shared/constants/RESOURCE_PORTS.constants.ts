import { RESOURCE_TYPES, type ResourceType } from "./RESOURCE_TYPES.constants";

export const RESOURCE_PORTS: Record<ResourceType, number> = {
  [RESOURCE_TYPES.DNS]: 53,
  [RESOURCE_TYPES.CDN]: 443,
  [RESOURCE_TYPES.Firewall]: 0,
  [RESOURCE_TYPES.LoadBalancer]: 80,
  [RESOURCE_TYPES.VirtualMachine]: 22,
  [RESOURCE_TYPES.ContainerRegistry]: 443,
  [RESOURCE_TYPES.Cache]: 6379,
  [RESOURCE_TYPES.Database]: 5432,
  [RESOURCE_TYPES.ObjectStorage]: 0,
  [RESOURCE_TYPES.MessageQueue]: 5672,
  [RESOURCE_TYPES.MonitoringAgent]: 9090,
} as const;

export type ResourcePortsType = typeof RESOURCE_PORTS;