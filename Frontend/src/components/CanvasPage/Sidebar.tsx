import { SidebarIcon } from "./SidebarIcon";

export function Sidebar() {
  return (
    <div className="w-16 h-full bg-gray-950 border-r border-gray-800 flex flex-col items-center gap-4 pt-4">
      <SidebarIcon emoji="🖥" label="Virtual Machine" />
      <SidebarIcon emoji="🗄" label="Database" />
      <SidebarIcon emoji="💾" label="Storage" />
      <SidebarIcon emoji="⚖" label="Load Balancer" />
      <SidebarIcon emoji="📡" label="CDN" />
    </div>
  )
}