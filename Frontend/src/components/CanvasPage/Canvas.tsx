import { useDroppable } from "@dnd-kit/core";

export interface CanvasProps {
  items: Array<{id: string, type: string, emoji: string, x: number, y: number}>;
  onDeleteItem: (itemId: string) => void;
}

export function Canvas({ items, onDeleteItem }: CanvasProps) {
  const { setNodeRef } = useDroppable({
    id: "canvas"
  })

  return (
    <div
      id="canvas"
      ref={setNodeRef}
      className="flex-1 h-full relative"
      style={{
        backgroundImage: `radial-gradient(circle, #1e293b 1px, transparent 1px)`,
        backgroundSize: "24px 24px",
      }}
    >
      {/* Dropped icons will appear here */}
      {items.map((item) => {
        return <div 
          key={item.id}
          className="absolute group w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center text-lg select-none"
          style={{ left: item.x, top: item.y}}
        >
          { item.emoji }
          <button
            className="absolute -top-1.5 -right-1.5 w-3 h-3 ronded-full bg-red-500 hover:bg-red-400 text-white text-[11px] flex items-center justify-center leading-none opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-md"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteItem(item.id);
            }}
          >
            X
          </button>
        </div>
      })}
    </div>
  )
}