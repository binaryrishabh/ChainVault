import { SidebarResource } from "./SidebarResource";

export function Sidebar() {
  return (
    <div className="w-16 h-full bg-gray-950 border-r border-gray-800 flex flex-col items-center gap-4 pt-4">
      {/* Entry Points — user-facing, first touch */}
      <SidebarResource emoji="🌐" label="DNS" />
      <SidebarResource emoji="📡" label="CDN" />

      {/* Traffic Management */}
      <SidebarResource emoji="🔥" label="Firewall" />
      <SidebarResource emoji="⚖" label="Load Balancer" />

      {/* Compute */}
      <SidebarResource emoji="🖥" label="Virtual Machine" />
      <SidebarResource emoji="📦" label="Container Registry" />

      {/* Data Layer */}
      <SidebarResource emoji="⚡" label="Cache" />
      <SidebarResource emoji="🗄" label="Database" />
      <SidebarResource emoji="💾" label="Object Storage" />

      {/* Async & Messaging */}
      <SidebarResource emoji="📨" label="Message Queue" />

      {/* Observability */}
      <SidebarResource emoji="📊" label="Monitoring Agent" />
    </div>
  )
}