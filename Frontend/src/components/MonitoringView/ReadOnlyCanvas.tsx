import type { ChaosEvents } from "@shared/types/ChaosEvents.types";
import type { ConnectionLine } from "@shared/types/ConnectionLine.types";
import type { Resource } from "@shared/types/Resource.types";
import { ManhattenLine } from "../CanvasPage/ManhattenLine";
import { DeploymentChaosNames, type DeploymentChaosNamesType } from "@shared/enum/DeploymentChaosNames.enum";
import { ResourceIcon } from "../CanvasPage/ResourceIcon";

interface ReadOnlyCanvasProps {
  resources: Resource[];
  connectionLines: ConnectionLine[];
  chaosEvents: ChaosEvents[];
}

type ResourceStateType = DeploymentChaosNamesType | "healthy" | "degraded";

export function ReadOnlyCanvas({ resources, connectionLines, chaosEvents }: ReadOnlyCanvasProps) {
  const getResourceState = (resourceId: string): ResourceStateType  => {
    const chaosForResource = chaosEvents.filter(chaosEvent => chaosEvent.resourceId === resourceId);
    if(chaosForResource.some(chaosEvent => chaosEvent.type === DeploymentChaosNames.Crash)) {
      return DeploymentChaosNames.Crash;
    }
    if(chaosForResource.some(chaosEvent => chaosEvent.type === DeploymentChaosNames.CpuSpike)) {
      return DeploymentChaosNames.CpuSpike;
    }
    if(chaosForResource.some(chaosEvent => chaosEvent.type === DeploymentChaosNames.NetworkDelay)) {
      return DeploymentChaosNames.NetworkDelay;
    }
    if(chaosForResource.some(chaosEvent => chaosEvent.type === DeploymentChaosNames.MemoryLeak)) {
      return DeploymentChaosNames.MemoryLeak;
    }
    if(chaosForResource.some(chaosEvent => chaosEvent.type === DeploymentChaosNames.DiskFailure)) {
      return DeploymentChaosNames.DiskFailure;
    }
    return "healthy";
  }

  const stateColors: Record<ResourceStateType, string> = {
    healthy: "ring-green-500",
    [DeploymentChaosNames.Crash]: "ring-red-500 animate-pulse",
    [DeploymentChaosNames.CpuSpike]: "ring-amber-500 animate-pulse",
    [DeploymentChaosNames.NetworkDelay]: "ring-yellow-500",
    [DeploymentChaosNames.MemoryLeak]: "ring-yellow-500",
    [DeploymentChaosNames.DiskFailure]: "ring-red-500",
    degraded: "ring-yellow-500",
  };

  
  const stateIconColors: Record<ResourceStateType, string> = {
    healthy: "text-green-500",
    [DeploymentChaosNames.Crash]: "text-red-500 animate-pulse",
    [DeploymentChaosNames.CpuSpike]: "text-amber-500 animate-pulse",
    [DeploymentChaosNames.NetworkDelay]: "text-yellow-500",
    [DeploymentChaosNames.MemoryLeak]: "text-yellow-500",
    [DeploymentChaosNames.DiskFailure]: "text-red-500",
    degraded: "text-yellow-500"
  };


  return (
    <div className="relative w-full h-full bg-[#0f1117] rounded-lg border border-gray-800 overflow-hidden">
      {/* Connection lines */}
      <svg className="absolute inset-0 pointer-events-none z-10" width="100%" height="100%">
        {connectionLines.map(connectionLine => {
          const source = resources.find(resource => resource.id === connectionLine.sourceId)
          const target = resources.find(resource => resource.id === connectionLine.targetId)
          if(!source || !target) {
            return null;
          }

          return <ManhattenLine key={connectionLine.id} source={source} target={target} port={connectionLine.port}/>;
        })}
      </svg>

      {/* Resources */}
      {resources.map(resource => {
        const state: ResourceStateType = getResourceState(resource.id);
        return (
          <div
            key={resource.id}
            className={`absolute w-12 h-12 rounded-lg ring-2 flex items-center justify-center text-lg ${stateColors[state]}`}
            style={{ left: resource.x, top: resource.y }}
            title={resource.type}
          >
            <ResourceIcon type={resource.type} size={20} className={stateIconColors[state]}/>
          </div>
        )
      })}
    </div>
  )
}