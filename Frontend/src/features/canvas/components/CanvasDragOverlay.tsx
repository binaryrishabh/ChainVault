import { DragOverlay } from "@dnd-kit/core";
import { ResourceIcon } from "@/components/common/ResourceIcon";
import type { ResourceType } from "@shared/constants/RESOURCE_TYPES.constants";

interface CanvasDragOverlayProps {
  activeDrag: { label: ResourceType } | null;
}

export function CanvasDragOverlay({ activeDrag }: CanvasDragOverlayProps) {
  return (
    <DragOverlay>
      {activeDrag && (
        <div className="w-12 h-12 rounded-lg bg-[#12162F] border border-[#35415A] flex items-center justify-center shadow-xl opacity-90">
          <ResourceIcon
            type={activeDrag.label}
            size={24}
            className="text-blue-400"
          />
        </div>
      )}
    </DragOverlay>
  );
}