import { DndContext, DragOverlay, PointerSensor, TouchSensor, MouseSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Canvas } from "./Canvas";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { createDeployment, createInfrastructure, deleteInfrastructure, getAllInfrastructure, updateInfrastructure } from "@/api/api";
import { DeploymentPipeline } from "../DeploymentView/DeploymentPipeline";
import { ConfigPanelOfCanvasResource } from "./ConfigPanelOfCanvasResource";
import { validateConnection } from "@shared/validateConnectionRules";
import { RESOURCE_PORTS } from "@shared/constants/RESOURCE_PORTS.constants";
import { ResourceIcon } from "./ResourceIcon";
import type { Infrastructure } from "@shared/types/Infrastructure.types";
import type { ConnectionLine } from "@shared/types/ConnectionLine.types";
import type { ResourceType } from "@shared/constants/RESOURCE_TYPES.constants"
import type { Resource } from "@shared/types/Resource.types";


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

  const [activeDrag, setActiveDrag] = useState<{ label: ResourceType } | null>(null);

  const [canvasResources, setCanvasResources] = useState<Array<Resource>>([]);

  // states about current state of layout on canvas
  const [currentLayoutId, setCurrentLayoutId] = useState<string | null>(null);
  const [currentLayoutName, setCurrentLayoutName] = useState<string | null>(null);
  const [currentLayoutSaved, setCurrentLayoutSaved] = useState<boolean>(true);

  // states about dropdown
  const [showLayoutDropdown, setShowLayoutDropdown] = useState<boolean>(false);
  const [savedLayouts, setSavedLayouts] = useState<Array<Infrastructure>>([]);

  // set the deployment status when deploy button is clicked i.e. the handleDeploy handler below.
  const [activeDeploymentId, setActiveDeploymentId] = useState<string | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);

  // state of connection lines/grids between the resources on canvas...
  const [connectionLines, setConnectionLines] = useState<Array<ConnectionLine>>([]);
  const [selectedResource, setSelectedResource] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  // On clicking the resources on canavs -> a side panel opens showing there details/config...
  const [selectedResourceForConfig, setSelectedResourceForConfig] = useState<string | null>(null);

  // Set the state for undo/redo of resource elements on the canvas.
  // This is for the undo stack....
  const [ undoResourcesSnapshotStackTrace, setUndoResourcesSnapshotStackTrace ] = useState<Array<{
    resource: Resource,
    connectionLines: ConnectionLine[],
    savedState: boolean
  }>>([]);

  // This is for the redo stack....
  const [ redoResourcesSnapshotStackTrace, setRedoResourcesSnapshotStackTrace ] = useState<Array<{
    resource: Resource,
    connectionLines: ConnectionLine[],
    savedState: boolean
  }>>([]);

  /* ------Save the current state of canvas resources into localstorage prevents vanish on reloads----- */
  // state tracking for we have initialized the current state from localstorage or not
  const [isInitialized, setIsInitialized] = useState(false);

  // Restore on mount
  // Fetch for the first time when browser loads the page or reloads the page
  useEffect(() => {
    const infra = localStorage.getItem("Infraforge_Infrastucture_Draft");
    if (infra) {
      const parsed = JSON.parse(infra);
      setCanvasResources(parsed.canvasResources);
      setCurrentLayoutId(parsed.currentLayoutId);
      setCurrentLayoutName(parsed.currentLayoutName);
      setCurrentLayoutSaved(parsed.saved);
      setConnectionLines(parsed.connectionLines || []);
    }
    setIsInitialized(true); // Mark i.e. we got the current state from localstorage
  }, []);

  // Save to localStorage current infrastaructure state, but only after getting the current state from browser
  useEffect(() => {
    if (!isInitialized) return; // ← Skip on first render
    
    localStorage.setItem("Infraforge_Infrastucture_Draft", JSON.stringify({
      canvasResources,
      connectionLines,
      currentLayoutId,
      currentLayoutName,
      saved: currentLayoutSaved
    }));
  }, [canvasResources, currentLayoutId, currentLayoutName, connectionLines, currentLayoutSaved]);

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
  }, [currentLayoutSaved, canvasResources]);

  // Handle open close of infrastructure dropdown button
  const handleOpenCloseDropDownNameClick = async() => {
    setShowLayoutDropdown(!showLayoutDropdown);
  }

  // Select particular infrastrcture from dropdown lists
  const handleSelectLayout = (infrastructure: Infrastructure) => {
    if(isDeploying) { // Deployement already in process
      toast.warning("A deployment is in progress. Can't select");
      return;
    }

    setCurrentLayoutId(infrastructure.id);
    setCurrentLayoutName(infrastructure.name);
    setCanvasResources(infrastructure.layout.resources || []);
    setConnectionLines(infrastructure.layout.connectionLines || []);
    setCurrentLayoutSaved(true);
    setShowLayoutDropdown(false);
    setActiveDeploymentId(null);
    setIsDeploying(false);
    setSelectedResource(null);
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
  }, [showLayoutDropdown]);
  
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
    
    setCanvasResources([]);
    setCurrentLayoutId(null);
    setCurrentLayoutName(null);
    setCurrentLayoutSaved(true);
    setActiveDeploymentId(null);  
    setIsDeploying(false);
    setConnectionLines([]);
    setSelectedResource(null);
    localStorage.removeItem("Infraforge_Infrastucture_Draft");
  }

  // Infrastructure save button Make an input box for it and improve the UI
  const handleSave = async() => {
    if(isDeploying) { // Deployement already in process
      toast.warning("A deployment is in progress. Can't select");
      return;
    }

    if(canvasResources.length === 0) {
      toast.warning("No resources on the canvas");
      return;
    }
    const name = window.prompt("Enter layout name:")?.trim();
    if(!name) {
      toast.warning("name can't be empty")
      return;
    }
    try {
      const createdInfrastructure = await createInfrastructure(name, { 
        resources: canvasResources,
        connectionLines
      });
      setCurrentLayoutId(createdInfrastructure.id);
      setCurrentLayoutName(createdInfrastructure.name);
      setCurrentLayoutSaved(true);
      setActiveDeploymentId(null);
      setIsDeploying(false);
      
      console.log(createdInfrastructure.id);
      toast.success("saved!");
    }
    catch(err) {
      toast.error("Save failed");
      console.log(err);      
    }
  }

  // Infrastructure update button
  const handleUpdate = async() => {
    if(isDeploying) { // Deployement already in process
      toast.warning("A deployment is in progress. Can't select");
      return;
    }

    if(!currentLayoutId || !currentLayoutName) { // This will never happen
      toast.warning("Either current layout not saved or board is empty")
      return;
    }
    const name = window.prompt("Update layout name:", currentLayoutName)?.trim();
    if(canvasResources.length === 0) {
      toast.warning("No resources on the canvas");
      return;
    }
    if(!name) {
      toast.warning("name can't be empty")
      return;
    }

    try {
      const updatedInfrastructure = await updateInfrastructure(currentLayoutId, { 
        name, 
        layout: { 
          resources: canvasResources,
          connectionLines
        }
      });
      setCurrentLayoutName(name);
      setCurrentLayoutSaved(true);
      setActiveDeploymentId(null);
      setIsDeploying(false);

      toast.success("Updated!");
      console.log("Updated: "+ updatedInfrastructure);
    }
    catch (err) {
      toast.error("Update Failed");
      console.log(err);
    }
  }

  // Infrastructure delete button
  const handleDelete = async() => {
    if(isDeploying) { // Deployement already in process
      toast.warning("A deployment is in progress. Can't select");
      return;
    }

    if(!currentLayoutId) {
      toast.warning("No layout loaded to delete")
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
      setCanvasResources([]);
      setCurrentLayoutSaved(true);
      setIsInitialized(false);
      setActiveDeploymentId(null);
      setIsDeploying(false);
      setConnectionLines([]);
      setSelectedResource(null);

      localStorage.removeItem("Infraforge_Infrastucture_Draft");
      console.log("deleted: "+ deletedInfrastructure); 
      toast.success("Deleted!");
    }
    catch(err) {
      toast.error("Delete failed")
      console.log(err);
    }
  }

  // Deploy button
  const handleDeploy = async () => { 
    if(isDeploying) { // Deployement already in process
      toast.warning("A deployment is in progress. Can't select");
      return;
    }

    if(!currentLayoutId || !currentLayoutSaved) {
      toast.warning("Save the infrastructure first before deploying.");
      return;
    }

    if(canvasResources.length === 0 && !savedLayouts) {
      toast.warning("Add resources to the canvas before deploying.");
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

  /* ----------------------Canvas Resources------------------ */
  // Delete canvas resource
  const handleDeleteCanvasResource = (resourceId: string) => {
    if(isDeploying) { // Deployement already in process
      toast.warning("A deployment is in progress. Can't select");
      return;
    }

    // Find particular resource on the canvas whse resourceId has been passed.
    const resource = canvasResources.find(canvasResource => canvasResource.id === resourceId);

    // Fing the resource whose resourceId has been passed and   has any connection or not
    const touchingConnections = connectionLines.filter(
      connectionLine => connectionLine.sourceId === resourceId || connectionLine.targetId === resourceId
    )

    if(resource) {
      setUndoResourcesSnapshotStackTrace(prev => [...prev, {
        resource,
        connectionLines: touchingConnections,
        savedState: currentLayoutSaved
      }]);
    }

    // Delete resource
    setCanvasResources(prev => prev.filter(resource => resource.id !== resourceId));

    // Delete connectionLines touching this resource (fixes dangling connections)
    setConnectionLines(prev => prev.filter(
      connectionLine => connectionLine.sourceId !== resourceId && connectionLine.targetId !== resourceId
    ))

    setCurrentLayoutSaved(false);

    // Undo toast
    toast("Resource deleted", {
      action: {
        label: "Undo",
        onClick: handleUndoDelete
      },
      duration: 5000
    })
  }

  /* ---------- Undo/Redo Code ------------ */
  // Undo Resource Delete handler
  const handleUndoDelete = () => {
    if(undoResourcesSnapshotStackTrace.length === 0) {
      return;
    }

    setUndoResourcesSnapshotStackTrace(prev => {
      if(prev.length === 0) {
        return prev;
      }

      const lastResourceSnapshot = prev[prev.length - 1];

      // Overlap check
      const occupied = canvasResources.some(
        resource => Math.abs(resource.x - lastResourceSnapshot.resource.x) < 40 && Math.abs(resource.y - lastResourceSnapshot.resource.y) < 40
      )
        
      // Don't put as place is already been occupied
      if(occupied) {
        toast.warning("Can't undo - that spot is now occupied");
        return prev.slice(0, -1); // Drop this lastResourceSnapshot and we don't place this one as potition has already been occupied, keep the rest.
      }

      // Add back to canvas
      setCanvasResources(prev => [...prev, lastResourceSnapshot.resource]);
      setConnectionLines(prev => [...prev, ...lastResourceSnapshot.connectionLines]);
      setCurrentLayoutSaved(lastResourceSnapshot.savedState);

      // Push to redo stack
      setRedoResourcesSnapshotStackTrace(prev => [...prev, lastResourceSnapshot]);

      return prev.slice(0, -1); // Remove from undo stack
    });

    toast.success("Resource restored");
  }

  // Redo Deleted Resouces from canvas handler
  const handleRedoDelete = () => {
    if(redoResourcesSnapshotStackTrace.length === 0) {
      return;
    }

    setRedoResourcesSnapshotStackTrace(prev => {
      if(prev.length === 0) {
        return prev;
      }

      const lastResourceSnapshot = prev[prev.length - 1];

      // Delete the resource + it's connections again that u have undo lately
      setCanvasResources(prev => prev.filter(resource => resource.id !== lastResourceSnapshot.resource.id));
      setConnectionLines(prev => prev.filter(resource => resource.sourceId !== lastResourceSnapshot.resource.id && resource.targetId !== lastResourceSnapshot.resource.id));

      return prev.slice(0, -1);
    })
  }

  // Cmd/Ctrl+z keyboard listener
  useEffect(() => {
    const handleKeyPressed = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA";

      if((event.ctrlKey || event.metaKey) &&  event.key == "z" && !isInput && undoResourcesSnapshotStackTrace.length > 0) {
        event.preventDefault();
        handleUndoDelete();
      }
    }

    window.addEventListener("keydown", handleKeyPressed);
    return () => window.removeEventListener("keydown", handleKeyPressed);
  }, [undoResourcesSnapshotStackTrace, canvasResources, connectionLines]);

  /* ----------------------CONNECTION LINES BETWEEN RESOURCES ON CANVAS------------------ */
  // Form connection line between 2 resources
  const hanldeResouceClick = (resourceId: string, resourceType: ResourceType) => {
    if(!isConnecting) {
      return;
    }

    const alreadyConnectionLineExists = connectionLines.some(
      connectionLine => connectionLine.sourceId === selectedResource && connectionLine.targetId === resourceId
    )

    if(alreadyConnectionLineExists) {
      toast.warning("Connection already exists!");
      setSelectedResource(null);
      return;
    }

    if(!selectedResource) {
      setSelectedResource(resourceId);
    }
    else if(selectedResource === resourceId) { // making connection with the resource itself
      setSelectedResource(null); // Deselect
    }
    else { // create connection
      const sourceItem = canvasResources.find(resource => resource.id === selectedResource);

      if(!sourceItem) {
        return;
      }

      const validConnection = validateConnection(sourceItem.type, resourceType);

      if(!validConnection.valid) { // Check even connection is valid or not
        toast.warning(validConnection.message);
        setSelectedResource(null);
        return;
      }

      if(sourceItem) {
        const port = RESOURCE_PORTS[sourceItem.type] || 80;
        
        setCurrentLayoutSaved(false);

        setConnectionLines(prev => [...prev, {
          id: `connection-${Date.now()}`,
          sourceId: selectedResource,
          targetId: resourceId,
          sourceType: sourceItem.type,
          targetType: resourceType,
          port
        }])
      }
      setSelectedResource(null);
    }
  }

  const handleToggleConnectionLines = () => {
    setIsConnecting(!isConnecting);
    setSelectedResource(null);
  }

  /* Config panel to show the detailes of the resouces present on the canvas by double clicking it... */
  const handleResourceDoubleClickShowConfig = (resourceId: string) => {
    setSelectedResourceForConfig(resourceId);
  }
  
  // close the config by clicking anywhere except the config panel itself.
  useEffect(() => {
    const handleClickOutsideConfigPanel = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if(!target.closest(".config-panel-container")) {
        setSelectedResourceForConfig(null);
      }
    }
    
    if(selectedResourceForConfig) {
      document.addEventListener("click", handleClickOutsideConfigPanel);
    }

    return () => document.removeEventListener("click", handleClickOutsideConfigPanel);
  }, [selectedResourceForConfig])

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(event) => {
        const label = event.active.id as ResourceType;
        setActiveDrag({ label })
        console.log("Drag started:", event.active.id)
      }}
      onDragEnd={(event) => {
        setActiveDrag(null);
        
        console.log("over id: ", event.over?.id);
        
        if(event.over?.id === "canvas") {
          setCurrentLayoutSaved(false); // tracking there was a new resource added to the canvas
          setIsInitialized(true); // saving to localstorage there was a new resource added to the canvas

          const { active, delta } = event;

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

          const isOverlapping = canvasResources.some(
            (resource) => Math.abs(resource.x - x) < 40 && Math.abs(resource.y - y) < 40
          )

          if(isOverlapping) {
            toast.warning("Space already occupied!");
            return;
          }
          
          console.log("Drag ended:", event.active.id, event.over?.id, x, y);

          setCanvasResources((prev) => [
            ...prev,
            {
              id: `${active.id}-${Date.now()}`,
              type: active.id as ResourceType,
              x,
              y
            }
          ])
        }
      }}
    >
      <DragOverlay>
        { activeDrag ? (
          <div className="w-12 h-12 rounded-lg bg-[#12162F] border border-[#35415A] flex items-center justify-center shadow-xl opacity-90">
            <ResourceIcon type={activeDrag.label} size={24} className="text-blue-400" />
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
          isConnecting={isConnecting}
          handleToggleConnectionLines={handleToggleConnectionLines}
        />
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <Sidebar />

          {/* Canvas */}
          <Canvas 
            resources={ canvasResources } 
            onDeleteResource={handleDeleteCanvasResource} 
            onResourceClick={hanldeResouceClick}
            connectionLines={connectionLines}
            selectedResource={selectedResource}
            isConnecting={isConnecting}
            onResourceDoubleClick={handleResourceDoubleClickShowConfig}
          />
        </div>
      </div>

      {/* Config/Detail Panel for resource of Canvas */}
      {selectedResourceForConfig && (
        <ConfigPanelOfCanvasResource 
          resource={canvasResources.find(resource => resource.id === selectedResourceForConfig)}
          onClose={() => setSelectedResourceForConfig(null)}
        />
      )}

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