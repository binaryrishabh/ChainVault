import { DndContext, DragOverlay, PointerSensor, TouchSensor, MouseSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useEffect, useState } from "react";
import { Canvas } from "./Canvas";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { createDeployment, createInfrastructure, deleteInfrastructure, getAllInfrastructure, updateInfrastructure } from "../../api/api";
import { DeploymentPipeline } from "../DeploymentView/DeploymentPipeline";
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

  // set the deploymet status when deploy button is clicked i.e. the handleDeploy handler below.
  const [activeDeploymentId, setActiveDeploymentId] = useState<string | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);

  /* ------Save the current state of canvas icons into localstorage prevents vanish on reloads----- */
  // state tracking for we have initialized the current state from localstorage or not
  const [isInitialized, setIsInitialized] = useState(false);

  // Restore on mount
  // Fetch for the first time when browser loads the page or reloads the page
  useEffect(() => {
    const infra = localStorage.getItem("Infraforge_Infrastucture_Draft");
    if (infra) {
      const parsed = JSON.parse(infra);
      setCanvasItems(parsed.canvasItems);
      setCurrentLayoutId(parsed.currentLayoutId);
      setCurrentLayoutName(parsed.currentLayoutName);
      setCurrentLayoutSaved(parsed.saved);
    }
    setIsInitialized(true); // Mark i.e. we got the current state from localstorage
  }, []);

  // Save to localStorage current infrastaructure state, but only after getting the current state from browser
  useEffect(() => {
    if (!isInitialized) return; // ← Skip on first render
    
    localStorage.setItem("Infraforge_Infrastucture_Draft", JSON.stringify({
      canvasItems,
      currentLayoutId,
      currentLayoutName,
      saved: currentLayoutSaved
    }));
  }, [canvasItems, currentLayoutId, currentLayoutName, currentLayoutSaved]);

  /* ----------------------Topbar dropdown------------------- */
  // fetch infrastructure to fill dropdown
  useEffect(() => {
    const fetchInfrastructures = async () => {
      try {
        const allInfrastructures = await getAllInfrastructure();
        setSavedLayouts(allInfrastructures);
      }
      catch(err) {
        console.log("fetchInfrastructures error: "+ err);
      }
    }
    fetchInfrastructures();
  }, [currentLayoutSaved, canvasItems])

  // Handle open close of infrastructure dropdown button
  const handleOpenCloseDropDownNameClick = async() => {
    setShowLayoutDropdown(!showLayoutDropdown);
  }

  // Select particular infrastrcture from dropdown lists
  const handleSelectLayout = (infrastructure: Infrastructure) => {
    if(isDeploying) { // Deployement already in process
      window.alert("A deployment is in progress. Can't select");
      return;
    }

    setCurrentLayoutId(infrastructure.id);
    setCurrentLayoutName(infrastructure.name);
    setCanvasItems(infrastructure.layout.icons || []);
    setCurrentLayoutSaved(true);
    setShowLayoutDropdown(false);
    setActiveDeploymentId(null);
    setIsDeploying(false);
  }

  // close dropdown by clicking anywhere except the dropdown itself
  useEffect(() => {
    const handleClickOutsideRemoveDropdown = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if(!target.closest(".dropdown-container")) {
        setShowLayoutDropdown(false);
      }
    }

    if(showLayoutDropdown) { // add event listener only if dropdown is open
      document.addEventListener("click", handleClickOutsideRemoveDropdown);
    }

    return () => document.removeEventListener("click", handleClickOutsideRemoveDropdown)
  }, [showLayoutDropdown])
  
  /* ----------------------Topbar buttons------------------ */
  // New canvas button
  const handleNew = () => {
    if(isDeploying) { // Deployement already in process
      const abort = window.confirm("A deployment is in progress. Abort and start fresh?");
      if(!abort) return;
      setActiveDeploymentId(null);
      setIsDeploying(false);
    }

    if(!currentLayoutSaved) {
      const discard = window.confirm("You have unsaved changes. Discard them!");
      if(!discard) return;
    }
    
    setCanvasItems([]);
    setCurrentLayoutId(null);
    setCurrentLayoutName(null);
    setCurrentLayoutSaved(true);
    setActiveDeploymentId(null);
    setIsDeploying(false);
    localStorage.removeItem("Infraforge_Infrastucture_Draft");
  }

  // Infrastructure save button Make an input box for it and improve the UI
  const handleSave = async() => {
    if(isDeploying) { // Deployement already in process
      window.alert("A deployment is in progress. Can't select");
      return;
    }

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
      setActiveDeploymentId(null);
      setIsDeploying(false);
      
      console.log(createdInfrastructure.id);
      alert("saved!");
    }
    catch(err) {
      alert("Save failed");
      console.log(err);      
    }
  }

  // Infrastructure update button
  const handleUpdate = async() => {
    if(isDeploying) { // Deployement already in process
      window.alert("A deployment is in progress. Can't select");
      return;
    }

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
      setActiveDeploymentId(null);
      setIsDeploying(false);

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
    if(isDeploying) { // Deployement already in process
      window.alert("A deployment is in progress. Can't select");
      return;
    }

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
      setCurrentLayoutName(null);
      setCanvasItems([]);
      setCurrentLayoutSaved(true);
      setIsInitialized(false);
      setActiveDeploymentId(null);
      setIsDeploying(false);

      localStorage.removeItem("Infraforge_Infrastucture_Draft");
      console.log("deleted: "+ deletedInfrastructure); 
      alert("Deleted!");
    }
    catch(err) {
      alert("Delete failed")
      console.log(err);
    }
  }

  // Deploy button
  const handleDeploy = async () => { 
    if(isDeploying) { // Deployement already in process
      window.alert("A deployment is in progress. Can't select");
      return;
    }

    if(!currentLayoutId || !currentLayoutSaved) {
      alert("Save the infrastructure first before deploying.");
      return;
    }

    if(canvasItems.length === 0 && !savedLayouts) {
      alert("Add resources to the canvas before deploying.");
      return;
    }

    try {
      // Auto close previous pannel
      setActiveDeploymentId(null);

      // small delay to let last Websocket connection get cleaned up...
      await new Promise(r => setTimeout(r, 100));

      const deployment = await createDeployment(currentLayoutId);

      console.log("Deployment started: ", deployment);
      
      // Later: open pipeline panel to show progress
      setActiveDeploymentId(deployment.id);
      setIsDeploying(true);
    }
    catch(err) {
      console.error("Error from handleDeploy: "+ err);
    }
  }

  /* ----------------------Canvas Icons------------------ */
  const handleDeleteCanvasItem = (itemId: string) => {
    if(isDeploying) {
      return; // Deployment already in process
    }
    setActiveDeploymentId(null);
    setIsDeploying(false);
    setCanvasItems(prev => {
      const updtatedItems = prev.filter(item => item.id !== itemId);
      if(updtatedItems.length === 0) {
        setCurrentLayoutSaved(true);  
      }
      return updtatedItems;
    })
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
          setCurrentLayoutSaved(false); // tracking there was a new item added to the canvas
          setIsInitialized(true); // saving to localstorage there was a new item added to the canvas

          const { active, delta } = event;
          const emoji = active.data.current?.emoji || "🖥";

          // Get the canvas element
          const canvas = document.querySelector("#canvas")as HTMLElement;
          const canvasRect = canvas?.getBoundingClientRect();

          // calculate drop position relative to canvas using delta
          let x = 50, y = 50;
          if(canvasRect) {
            // Get the initial position of the drag relative to canvas
            const pointerEvent = event.activatorEvent as PointerEvent;
            x = pointerEvent.clientX - canvasRect.left + delta.x - 20; // these - constant values are according to the visuals
            y = pointerEvent.clientY - canvasRect.top + delta.y - 20;

            if(x < 0 || y < 0 ){
              return;
            }
            
            const GRID_SIZE = 24; // matches background dot grid
            
            x = Math.round(x / GRID_SIZE) * GRID_SIZE;
            y = Math.round(y / GRID_SIZE) * GRID_SIZE;
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
          currentLayoutSaved={currentLayoutSaved}
          handleNew={handleNew} 
          handleSave={handleSave}
          handleUpdate={handleUpdate} 
          handleDeploy={handleDeploy}
          handleDelete={handleDelete}
        />
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <Sidebar />

          {/* Canvas */}
          <Canvas items={ canvasItems } onDeleteItem={handleDeleteCanvasItem} />
        </div>
      </div>
      
      {/* Deploy button press affect */}
      {activeDeploymentId &&
        <DeploymentPipeline 
          deploymentId={activeDeploymentId} 
          onDeploymentPreviewClose={() => {
            setActiveDeploymentId(null);
            setIsDeploying(false);
          }}
          onDeploymentComplete={() => setIsDeploying(false)}
          onDeploymentFailed={() => setIsDeploying(false)}
        />
      }
    </DndContext>
  )
}