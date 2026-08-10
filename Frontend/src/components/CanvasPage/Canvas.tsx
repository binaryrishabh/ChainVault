import { useDroppable } from "@dnd-kit/core";
import { ManhattenLine } from "./ManhattenLine";

export interface CanvasProps {
  resources: Array<{ id: string, type: string, emoji: string, x: number, y: number }>;
  onDeleteResource: (itemId: string) => void;
  onResourceClick: (resourceId: string, resourceType: string) => void;
  connections: Array<{id: string, sourceId: string, targetId: string, sourceType: string, targetType: string, port: number }>;
  selectedResource: string | null;
  isConnecting: boolean;
}

export function Canvas({ resources, onDeleteResource, onResourceClick, connections, selectedResource, isConnecting }: CanvasProps) {
  const { setNodeRef } = useDroppable({
    id: "canvas",
  });

  return (
    <div
      id="canvas"
      ref={setNodeRef}
      className="flex-1 h-full relative"
      style={{
        backgroundImage: `radial-gradient(circle, #1e293b 1px, transparent 1px)`,
        backgroundSize: "24px 24px"
      }}
    >
      {/* Connecting lines SVG - behind resources */}
      <svg className="absolute inset-0 pointer-events-none z-10" width="100%" height="100%">
        {connections.map(connection => {
          const source = resources.find(resource => resource.id === connection.sourceId);
          const target = resources.find(resource => resource.id === connection.targetId);
          if(!source || !target) {
            return null;
          }
          return <ManhattenLine key={connection.id} source={source} target={target} port={connection.port}/>
        })}
      </svg>

      {/* Dropped Resources will appear here */}
      {resources.map((resource) => {
        return (
          <div
            key={resource.id}
            className={`absolute group w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center text-lg select-none hover:ring-2 hover:ring-blue-500 cursor-pointer ${selectedResource === resource.id ? 'ring-2 ring-yellow-400': ''}`}
            style={{ left: resource.x, top: resource.y }}
            onClick={() => onResourceClick(resource.id, resource.type)}
          >
            {resource.emoji}
            {isConnecting && (
              <>
                {/* Top port */}
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" title="Port" />
                {/* Right port */}
                <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" title="Port" />
                {/* Bottom port */}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" title="Port" />
                {/* Left port */}
                <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" title="Port" />
              </>
            )}
            <button
              className="absolute -top-1.5 -right-1.5 w-3 h-3 ronded-full bg-red-500 hover:bg-red-400 text-white text-[11px] flex items-center justify-center leading-none opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-md"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteResource(resource.id);
              }}
            >
              X
            </button>
          </div>
        );
      })}
    </div>
  );
}
