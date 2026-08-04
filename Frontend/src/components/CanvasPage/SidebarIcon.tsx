import { useDraggable } from "@dnd-kit/core"

export interface SidebarIconProps {
  emoji: string,
  label: string
}

export function SidebarIcon({ emoji, label }: SidebarIconProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: label, // SideBar icon labels
    data: { emoji, label }
  })

  // ref={ setNodeRef } tells which one is dragged currently
  // { ...listeners } adds mouse/keyboard handlers
  // { ...attributes } adds roles and tabIndex i.e. roles makes it something different from others and make it draggable. tabs is could be focused by tab key of keyboard. useDraggable sets tabIndex="0" so keyboard users can Tab to the icon, press Enter/Space to start dragging, arrow keys to move, Enter/Space to drop. Without this, drag-and-drop is mouse-only.
  return (
    <div
      ref={ setNodeRef }
      { ...listeners }
      { ...attributes }
      className='w-10 h-10 rounded-lg bg-gray-800 hover:bg-gray-700 cursor-grab flex items-center justify-center text-lg select-none' 
      style={ transform ? { opacity: 0.3, transform: "none" } : undefined }
      title={label}
    >
      { emoji }
    </div>
  )
}