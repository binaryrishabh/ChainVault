import { ManhattanConnectionLine } from "./ManhattanConnectionLine";
import type { ConnectionLine } from "@shared/types/ConnectionLine.types";
import type { Resource } from "@shared/types/Resource.types";

interface ConnectionLinesLayerProps {
  resources: Resource[];
  connectionLines: ConnectionLine[];
}

export function ConnectionLinesLayer({
  resources,
  connectionLines,
}: ConnectionLinesLayerProps) {
  return (
    <svg
      className="absolute inset-0 pointer-events-none z-10"
      width="100%"
      height="100%"
    >
      {connectionLines.map((connectionLine) => {
        const source = resources.find(
          (resource) => resource.id === connectionLine.sourceId
        );
        const target = resources.find(
          (resource) => resource.id === connectionLine.targetId
        );

        if (!source || !target) {
          return null;
        }

        return (
          <ManhattanConnectionLine
            key={connectionLine.id}
            source={source}
            target={target}
            port={connectionLine.port}
          />
        );
      })}
    </svg>
  );
}