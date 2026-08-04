  import { DndContext, DragOverlay, PointerSensor, TouchSensor, MouseSensor, useSensor, useSensors } from "@dnd-kit/core";
  import { useState } from "react";
  import { Canvas } from "./Canvas";
  import { Sidebar } from "./Sidebar";
  import { Topbar } from "./Topbar";
  import { createInfrastructure, deleteInfrastructure, getAllInfrastructure, updateInfrastructure } from "../../api/api";
import { type Infrastructure } from "../../Types/Infrastructure.types";

  export function DndContextComponent() {
      const sensors = useSensors(
      useSensor(PointerSensor, {
        activationConstraint: {
          distance: 5, // Must move 5px before drag starts (prevents accidental dragging on clicks)
        }
      }),
      useSensor(TouchSensor),
      useSensor(MouseSensor)
    )

    const [activeDrag, setActiveDrag] = useState<{ emoji: string, label: string } | null>(null);

    const [canvasItems, setCanvasItems] = useState<Array<{id: string, type: string, emoji: string, x: number, y: number}>>([]);

    // states about current state of layout on canvas
    const [currentLayoutId, setCurrentLayoutId] = useState<string | null>(null);
    const [currentLayoutName, setCurrentLayoutName] = useState<string | null>(null);
    const [currentLayoutSaved, setCurrentLayoutSaved] = useState<boolean>(true);

    // states about dropdown
    const [showLayoutDropdown, setShowLayoutDropdown] = useState<boolean>(false);
    const [savedLayouts, setSavedLayouts] = useState<Infrastructure[]>([]);

    /* ----------------------Topbar dropdown------------------- */
    const handleOpenCloseDropDownNameClick = async() => {
      if(!showLayoutDropdown) {
        const allInfrastructure = await getAllInfrastructure();
        setSavedLayouts(allInfrastructure);
      }
      setShowLayoutDropdown(!showLayoutDropdown);
    }

    const handleSelectLayout = (infrastructure: Infrastructure) => {
      setCurrentLayoutId(infrastructure.id);
      setCurrentLayoutName(infrastructure.name);
      setCanvasItems(infrastructure.layout.icons || []);
      setCurrentLayoutSaved(true);
      setShowLayoutDropdown(false);
    }
    
    /* ----------------------Topbar buttons------------------ */
    // New canvas button
    const handleNew = () => {
      if(!currentLayoutSaved) {
        const discard = window.confirm("You have unsaved changes. Discard them!");
        if(!discard) return;
      }
      setCanvasItems([]);
      setCurrentLayoutId(null);
      setCurrentLayoutName(null);
      setCurrentLayoutSaved(true);
    }

    // Infrastructure save button Make an input box for it and improve the UI
    const handleSave = async() => {
      if(canvasItems.length === 0) {
        alert("No items on the canvas");
        return;
      }
      const name = window.prompt("Enter layout name:")?.trim();
      if(!name) {
        alert("name can't be empty")
        return;
      }
      try {
        const createdInfrastructure = await createInfrastructure(name, { icons: canvasItems });
        setCurrentLayoutId(createdInfrastructure.id);
        setCurrentLayoutName(createdInfrastructure.name);
        setCurrentLayoutSaved(true);
        console.log(createdInfrastructure.id);
        alert("saved!");
      }
      catch(err) {
        alert("Save failed");
        console.log(err);      
      }
    }
    
    // Infrastructure loading button
    const handleLoad = async() => {
      try {
        const allInfrastructure = await getAllInfrastructure();
        if(allInfrastructure.length === 0) {
          alert("No saved layouts found");
          return;
        }
        const { id, name, layout } = allInfrastructure[0];
        setCurrentLayoutId(id);
        setCurrentLayoutName(name);
        setCanvasItems(layout.icons || []);
        setCurrentLayoutSaved(true);
        console.log("Loaded: "+ id +" "+ name);
        alert("loaded");
      }
      catch (err) {
        alert("load failed");
        console.log(err);
      }
    }

    // Infrastructure update button
    const handleUpdate = async() => {
      if(!currentLayoutId || !currentLayoutName) { // This will never happen
        alert("Either current layout not saved or board is empty")
        return;
      }
      const name = window.prompt("Update layout name:", currentLayoutName)?.trim();
      if(canvasItems.length === 0) {
        alert("No items on the canvas");
        return;
      }
      if(!name) {
        alert("name can't be empty")
        return;
      }
      try {
        const updatedInfrastructure = await updateInfrastructure(currentLayoutId, { 
          name, 
          layout: { icons: canvasItems }
        });
        setCurrentLayoutName(name);
        setCurrentLayoutSaved(true);
        alert("Updated!");
        console.log("Updated: "+ updatedInfrastructure);
      }
      catch (err) {
        alert("Update Failed");
        console.log(err);
      }
    }

    // Infrastructure delete button
    const handleDelete = async() => {
      if(!currentLayoutId) {
        alert("No layout loaded to delete")
        return;
      }
      if(!currentLayoutSaved) {
        const discard = window.confirm("You have unsaved changes. Everything will be deleted with changes");
        if(!discard) return;
      }
      else {
        const discard = window.confirm("Are you sure you want to delete");
        if(!discard) return;
      }
      try {
        const deletedInfrastructure = await deleteInfrastructure(currentLayoutId);
        setCurrentLayoutId(null);
        setCanvasItems([]);
        setCurrentLayoutSaved(true);
        console.log("deleted: "+ deletedInfrastructure); 
        alert("Deleted!");
      }
      catch(err) {
        alert("Delete failed")
        console.log(err);
      }
    }

    /* ----------------------Canvas Icon buttons------------------ */    
    const handleDeleteCanvasItem = (itemId: string) => {
      setCanvasItems(prev => prev.filter(item => item.id !== itemId))
      setCurrentLayoutSaved(false);
    }

    return (
      <DndContext
        sensors={sensors}
        onDragStart={(event) => {
          const emoji = event.active.data.current?.emoji;
          const label = event.active.id as string;
          setActiveDrag({ emoji, label })
          console.log("Drag started:", event.active.id)
        }}
        onDragEnd={(event) => {
          setActiveDrag(null);
          
          console.log("over id: ", event.over?.id);

          
          if(event.over?.id === "canvas") {
            setCurrentLayoutSaved(false); // saving there was a new item added to the canvas

            const { active, delta } = event;
            const emoji = active.data.current?.emoji || "🖥";

            // Get the canvas element
            const canvas = document.querySelector("#canvas")as HTMLElement;
            const canvasRect = canvas?.getBoundingClientRect();

            // calculate drop position relative to canvas using delta
            let x = 50, y = 50;
            if(canvasRect) {
              // Get the initial position of the drag relative to canvas
              const pointerEEvent = event.activatorEvent as PointerEvent;
              x = pointerEEvent.clientX - canvasRect.left + delta.x - 20; // these - constant values are according to the visuals
              y = pointerEEvent.clientY - canvasRect.top + delta.y - 20;

              if(x < 0 || y < 0 ){
                return;
              }

              x = Math.max(x, 0);
              y = Math.max(y, 0);
            }

            const isOverlapping = canvasItems.some(
              (item) => Math.abs(item.x - x) < 40 && Math.abs(item.y - y) < 40
            )

            if(isOverlapping) {
              // alert("Space already occupied!");
              return;
            }
            
            console.log("Drag ended:", event.active.id, event.over?.id, x, y);

            setCanvasItems((prev) => [
              ...prev,
              {
                id: `${active.id}-${Date.now()}`,
                type: active.id as string,
                emoji: emoji,
                x,
                y
              }
            ])
          }
        }}
      >
        <DragOverlay>
          { activeDrag ? (
            <div className="w-10 h-10 rounded-lg bg-gray-700 flex items-center justify-center text-lg select-none opacity-80">
              { activeDrag.emoji }
            </div>
          ): null }
        </DragOverlay>
        <div className="flex flex-col h-screen bg-[#0f1117] text-white">
          
          {/* Top Bar */}
          <Topbar 
            showLayoutDropdown={showLayoutDropdown} 
            savedLayouts={savedLayouts} 
            handleOpenCloseDropDownNameClick={handleOpenCloseDropDownNameClick} 
            handleSelectLayout={handleSelectLayout} 
            currentLayoutId={currentLayoutId} 
            currentLayoutName={currentLayoutName} 
            handleNew={handleNew} 
            handleSave={handleSave} 
            handleLoad={handleLoad} 
            handleUpdate={handleUpdate} 
            handleDelete={handleDelete} 
          />
          <div className="flex flex-1 overflow-hidden">
            {/* Sidebar */}
            <Sidebar />

            {/* Canvas */}
            <Canvas items={ canvasItems } onDeleteItem={handleDeleteCanvasItem} />
          </div>
        </div>
      </DndContext>
    )
  }