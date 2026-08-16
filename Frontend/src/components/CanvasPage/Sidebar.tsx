import { RESOURCE_TYPES } from "@shared/constants/RESOURCE_TYPES.constants";
import { SidebarResource } from "./SidebarResource";

export function Sidebar() {
  return (
    <div className="w-16 h-full bg-gray-950 border-r border-gray-800 flex flex-col items-center gap-4 pt-4">
      {/* Entry Points — user-facing, first touch */}
      <SidebarResource label={RESOURCE_TYPES.DNS} />
      <SidebarResource label={RESOURCE_TYPES.CDN} />

      {/* Traffic Management */}
      <SidebarResource label={RESOURCE_TYPES.Firewall} />
      <SidebarResource label={RESOURCE_TYPES.LoadBalancer} />

      {/* Compute */}
      <SidebarResource label={RESOURCE_TYPES.VirtualMachine} />
      <SidebarResource label={RESOURCE_TYPES.ContainerRegistry} />

      {/* Data Layer */}
      <SidebarResource label={RESOURCE_TYPES.Cache} />
      <SidebarResource label={RESOURCE_TYPES.Database} />
      <SidebarResource label={RESOURCE_TYPES.ObjectStorage} />

      {/* Async & Messaging */}
      <SidebarResource label={RESOURCE_TYPES.MessageQueue} />

      {/* Observability */}
      <SidebarResource label={RESOURCE_TYPES.MonitoringAgent} />
    </div>
  )
}