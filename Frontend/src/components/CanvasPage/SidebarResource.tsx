import { useDraggable } from "@dnd-kit/core"
import { ResourceIcon } from "./ResourceIcon";
import type { ResourceType } from "@shared/constants/RESOURCE_TYPES.constants";

export function SidebarResource({ label }: { label: ResourceType }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: label, // SideBar Resource labels
    data: { label }
  })

  // ref={ setNodeRef } tells which one is dragged currently
  // { ...listeners } adds mouse/keyboard handlers
  // { ...attributes } adds roles and tabIndex i.e. roles makes it something different from others and make it draggable. tabs, it could be focused by tab key of keyboard. useDraggable sets tabIndex="0" so keyboard users can Tab to the Resource, press Enter/Space to start dragging, arrow keys to move, Enter/Space to drop. Without this, drag-and-drop is mouse-only.
  return (
    <div
      ref={ setNodeRef }
      { ...listeners }
      { ...attributes }
      className='w-12 h-12 rounded-lg bg-[#12161F] border border-[#1F2633] hover:border-[#35415A] hover:bg-[#171C27] cursor-grab flex items-center justify-center transition-colors duration-150 group'
      style={ transform ? { opacity: 0.4, transform: "none" } : undefined }
      title={ label }
    >
      <ResourceIcon type={label} size={20} />
    </div>
  )
}