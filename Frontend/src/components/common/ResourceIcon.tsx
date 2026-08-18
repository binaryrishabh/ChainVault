import { RESOURCE_TYPES, type ResourceType } from "@shared/constants/RESOURCE_TYPES.constants";
import { Database, Globe, HardDrive, Network, Package, Radio, Server, Shield, Zap, Activity, type LucideIcon, Inbox } from "lucide-react";

const ResourceIconMap: Record<ResourceType, LucideIcon> = {
  [RESOURCE_TYPES.DNS]: Globe,
  [RESOURCE_TYPES.CDN]: Radio,
  [RESOURCE_TYPES.Firewall]: Shield,
  [RESOURCE_TYPES.LoadBalancer]: Network,
  [RESOURCE_TYPES.VirtualMachine]: Server,
  [RESOURCE_TYPES.ContainerRegistry]: Package,
  [RESOURCE_TYPES.Cache]: Zap,
  [RESOURCE_TYPES.Database]: Database,
  [RESOURCE_TYPES.ObjectStorage]: HardDrive,
  [RESOURCE_TYPES.MessageQueue]: Inbox,
  [RESOURCE_TYPES.MonitoringAgent]: Activity
}

interface ResourceIconProps {
  type: ResourceType;
  size?: number;
  className?: string;
}

export function ResourceIcon({type, size = 20, className}: ResourceIconProps) {
  const IconComponent = ResourceIconMap[type] ?? Server;
  return <IconComponent size={size} strokeWidth={1.75} className={className ?? "text-gray-400"}></IconComponent>
}