import { RESOURCE_PORTS } from "@shared/constants/RESOURCE_PORTS.constants";
import type { Resource } from "@shared/types/Resource.types";
import { ResourceIcon } from "@/components/common/ResourceIcon";

interface ResourceConfigPanelProps {
  resource: Resource | undefined;
  onClose: () => void;  
}

export function ResourceConfigPanel({ resource, onClose }: ResourceConfigPanelProps) {
  if(!resource) {
    return null;
  }

  return (
    <div className="config-panel-container fixed right-0 top-12 bottom-0 w-64 bg-gray-950 border-l border-gray-800 p-4 z-30 overflow-y-auto hover:opacity-100 opacity-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">Resource Config</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-red-600 text-xs cursor-pointer">X</button>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-[10px] text-gray-500 uppercase"></p>
          
          <ResourceIcon type={ resource.type } size={24} />
          <h3 className="text-sm font-semibold text-white mt-3">{resource.type }</h3>
        </div>
        <div>
          <p className="text-[10px] text-gray-500 uppercase">Position</p>
          <p className="text-sm text-gray-300">x: {resource.x}, y: {resource.y}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-500 uppercase">Default Port</p>
          <p className="text-sm text-blue-400">{RESOURCE_PORTS[resource.type] || 80}</p>
        </div>
      </div>
    </div>
  )
}