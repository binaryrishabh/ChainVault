import { DndContext, DragOverlay, PointerSensor, TouchSensor, MouseSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Canvas } from "./Canvas";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { createDeployment, createInfrastructure, deleteInfrastructure, getAllInfrastructure, updateInfrastructure } from "@/api/api";
import { DeploymentPipeline } from "../DeploymentView/DeploymentPipeline";
import { ConfigPanelOfCanvasResource } from "./ConfigPanelOfCanvasResource";
import { InputModal } from "@/components/UI/InputModal";
import { ConfirmModal } from "@/components/UI/ConfirmModal";
import { TypeToConfirmModal } from "@/components/UI/TypeToConfirmModal";
import { validateConnection } from "@shared/validateConnectionRules";
import { RESOURCE_PORTS } from "@shared/constants/RESOURCE_PORTS.constants";
import { SAMPLE_ARCHITECTURE } from "@shared/constants/SAMPLE_ARCHITECTURE.constants";
import { ResourceIcon } from "./ResourceIcon";
import type { Infrastructure } from "@shared/types/Infrastructure.types";
import type { ConnectionLine } from "@shared/types/ConnectionLine.types";
import type { ResourceType } from "@shared/constants/RESOURCE_TYPES.constants"
import type { Resource } from "@shared/types/Resource.types";
import type { ModalState } from "@shared/types/ModalState.types";
import type { UndoCanvasResourceAction } from "@shared/types/UndoCanvasResourceAction.types";
import { Network } from "lucide-react";


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
  const [isDeploying, setIsDeploying] = useState<boolean>(false);

  // state of connection lines/grids between the resources on canvas...
  const [connectionLines, setConnectionLines] = useState<Array<ConnectionLine>>([]);
  const [selectedResource, setSelectedResource] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);

  // On clicking the resources on canavs -> a side panel opens showing there details/config...
  const [selectedResourceForConfig, setSelectedResourceForConfig] = useState<string | null>(null);

  // Set the input modal state of the canvas page
  const [modalState, setModalState] = useState<ModalState>(null);
  const [modalLoading, setModalLoading] = useState<boolean>(false);

  // This is for the undo stack for canavs resources....
  const [undoResourcesSnapshotStackTrace, setUndoResourcesSnapshotStackTrace] = useState<UndoCanvasResourceAction[]>([]);

  // This is for the redo stack for canavs resources....
  const [redoResourcesSnapshotStackTrace, setRedoResourcesSnapshotStackTrace] = useState<UndoCanvasResourceAction[]>([]);

  // This for the dismiss button next to the LoadSampleArchitecture
  const [emptyCanvasStateDismissed, setEmptyCanvasStateDismissed] = useState<boolean>(false);

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
    setUndoResourcesSnapshotStackTrace([]);
    setRedoResourcesSnapshotStackTrace([]);
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
  
  /* ----------------------Execute handlers (actual work, no guards, no modals)------------------ */
  const handleNewExecute = () => {
    setCanvasResources([]);
    setConnectionLines([]);
    setCurrentLayoutId(null);
    setCurrentLayoutName(null);
    setCurrentLayoutSaved(true);
    setActiveDeploymentId(null);
    setIsDeploying(false);
    setSelectedResource(null);
    setUndoResourcesSnapshotStackTrace([]);
    setRedoResourcesSnapshotStackTrace([]);
    localStorage.removeItem("Infraforge_Infrastucture_Draft");
  };

  const handleSaveWithName = async (name: string) => {
    const createdInfrastructure = await createInfrastructure(name, { 
      resources: canvasResources,
      connectionLines
    });
    setCurrentLayoutId(createdInfrastructure.id);
    setCurrentLayoutName(createdInfrastructure.name);
    setCurrentLayoutSaved(true);
    setActiveDeploymentId(null);
    setIsDeploying(false);
    setUndoResourcesSnapshotStackTrace([]);
    setRedoResourcesSnapshotStackTrace([]);
    return createdInfrastructure;
  };

  const handleUpdateWithName = async (name: string) => {
    const updatedInfrastructure = await updateInfrastructure(currentLayoutId!, { 
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
    setUndoResourcesSnapshotStackTrace([]);
    setRedoResourcesSnapshotStackTrace([]);
    return updatedInfrastructure;
  };

  const handleDeleteExecute = async () => {
    const deletedInfrastructure = await deleteInfrastructure(currentLayoutId!);
    setCurrentLayoutId(null);
    setCurrentLayoutName(null);
    setCanvasResources([]);
    setConnectionLines([]);
    setCurrentLayoutSaved(true);
    setIsInitialized(false);
    setActiveDeploymentId(null);
    setIsDeploying(false);
    setSelectedResource(null);
    setUndoResourcesSnapshotStackTrace([]);
    setRedoResourcesSnapshotStackTrace([]);
    localStorage.removeItem("Infraforge_Infrastucture_Draft");
    return deletedInfrastructure;
  };

  const handleDeployExecute = async () => {
    setActiveDeploymentId(null);
    await new Promise(r => setTimeout(r, 100));
    
    const deployment = await createDeployment(currentLayoutId!);
    setActiveDeploymentId(deployment.id);
    setIsDeploying(true);
    setUndoResourcesSnapshotStackTrace([]);
    setRedoResourcesSnapshotStackTrace([]);
    toast.success("Deployment started");
    return deployment;
  };

  /* ----------------------Topbar buttons (guards + open modals)------------------ */
  // New canvas button
  const handleNew = () => {
    const hasRunningDeployment = isDeploying;
    const hasUnsavedChanges = !currentLayoutSaved && canvasResources.length > 0;

    // If nothing to lose, just clear immediately (no modal)
    if (!hasRunningDeployment && !hasUnsavedChanges) {
      handleNewExecute();
      return;
    }

    // Build dynamic modal state
    let title = "Discard changes?";
    let description = "You have unsaved changes on the current canvas.";
    let confirmLabel = "Clear canvas";
    let warnings: Array<{ icon: "danger" | "warning"; text: string }> = [];

    if (hasRunningDeployment && hasUnsavedChanges) {
      title = "Abort deployment and clear canvas?";
      description = "Starting a new canvas will affect the current deployment and unsaved changes.";
      confirmLabel = "Abort and clear";
      warnings = [
        { icon: "danger", text: "The running deployment will be aborted." },
        { icon: "danger", text: "Unsaved canvas changes will be discarded." }
      ];
    } else if (hasRunningDeployment) {
      title = "Abort deployment?";
      description = "A deployment is currently running.";
      confirmLabel = "Abort deployment";
      warnings = [
        { icon: "danger", text: "The running deployment will be aborted." }
      ];
    } else if (hasUnsavedChanges) {
      warnings = [
        { icon: "danger", text: "Unsaved canvas changes will be discarded." }
      ];
    }

    setModalState({
      type: "confirm-new",
      title,
      description,
      confirmLabel,
      warnings
    });
  };

  // Infrastructure save button
  const handleSave = () => {
    if(isDeploying) {
      toast.warning("A deployment is in progress. Can't save.");
      return;
    }
    if(canvasResources.length === 0) {
      toast.warning("No resources on the canvas");
      return;
    }
    setModalState({ type: "save" });
  };

  // Infrastructure update button
  const handleUpdate = () => {
    if(isDeploying) {
      toast.warning("A deployment is in progress.");
      return;
    }
    if(!currentLayoutId || !currentLayoutName) {
      toast.warning("No layout loaded");
      return;
    }
    if(canvasResources.length === 0) {
      toast.warning("No resources on the canvas");
      return;
    }
    setModalState({ type: "update" });
  };

  // Infrastructure delete button
  const handleDelete = () => {
    if(isDeploying) {
      toast.warning("A deployment is in progress.");
      return;
    }
    if(!currentLayoutId) {
      toast.warning("No layout loaded to delete");
      return;
    }
    setModalState({ type: "delete" });
  };

  // Deploy button
  const handleDeploy = () => {
    if(isDeploying) {
      toast.warning("A deployment is in progress.");
      return;
    }
    if(!currentLayoutId || !currentLayoutSaved) {
      setModalState({ type: "save" });
      return;
    }
    if(canvasResources.length === 0) {
      toast.warning("Add resources to the canvas before deploying.");
      return;
    }
    setModalState({ type: "confirm-deploy" });
  };

  /* ----------------------Canvas Resources------------------ */
  // Delete canvas resource
  const handleDeleteCanvasResource = (resourceId: string) => {
    if(isDeploying) {
      toast.warning("A deployment is in progress. Can't delete.");
      return;
    }

    // Find particular resource on the canvas whose resourceId has been passed.
    const resource = canvasResources.find(canvasResource => canvasResource.id === resourceId);

    // Find connections touching this resource
    const touchingConnections = connectionLines.filter(
      connectionLine => connectionLine.sourceId === resourceId || connectionLine.targetId === resourceId
    )

    // Add to undo stack
    if(resource) {
      setUndoResourcesSnapshotStackTrace(prev => [...prev, {
        type: "delete",
        resource,
        connectionLines: touchingConnections,
        savedState: currentLayoutSaved
      }]);
      setRedoResourcesSnapshotStackTrace([]);
    }

    // Delete resource
    setCanvasResources(prev => prev.filter(r => r.id !== resourceId));

    // Delete touching connections (fixes dangling connections)
    setConnectionLines(prev => prev.filter(
      c => c.sourceId !== resourceId && c.targetId !== resourceId
    ))

    setCurrentLayoutSaved(false);

    // Undo toast
    toast("Resource deleted", {
      action: {
        label: "Undo",
        onClick: () => handleUndoRef.current()
      },
      duration: 5000
    })
  }

  /* ---------- Undo/Redo Code ------------ */
  const handleUndoResource = () => {
    if(isDeploying) {
      toast.warning("Can't undo or redo as deployment is in process");
      return;
    }

    if(undoResourcesSnapshotStackTrace.length === 0) return;

    const lastSnapshot = undoResourcesSnapshotStackTrace[undoResourcesSnapshotStackTrace.length - 1];
    if(!lastSnapshot) return;

    if(lastSnapshot.type === "add") {
      setCanvasResources(prev => prev.filter(r => r.id !== lastSnapshot.resource.id));
      setConnectionLines(prev => prev.filter(
        c => c.sourceId !== lastSnapshot.resource.id && c.targetId !== lastSnapshot.resource.id
      ));
      setCurrentLayoutSaved(lastSnapshot.savedState);
    } else {
      const occupied = canvasResources.some(
        r => Math.abs(r.x - lastSnapshot.resource.x) < 40 && Math.abs(r.y - lastSnapshot.resource.y) < 40
      )
      
      if(occupied) {
        toast.warning("Can't undo - that spot is now occupied");
        setUndoResourcesSnapshotStackTrace(prev => prev.slice(0, -1));
        return;
      }

      setCanvasResources(prev => [...prev, lastSnapshot.resource]);
      setConnectionLines(prev => [...prev, ...lastSnapshot.connectionLines]);
      setCurrentLayoutSaved(lastSnapshot.savedState);
    }

    setUndoResourcesSnapshotStackTrace(prev => prev.slice(0, -1));
    setRedoResourcesSnapshotStackTrace(prev => [...prev, lastSnapshot]);
    toast.success("Undo");
  };

  const handleRedoResource = () => {
    if(isDeploying) {
      toast.warning("Can't undo or redo as deployment is in process");
      return;
    }

    if(redoResourcesSnapshotStackTrace.length === 0) return;

    const lastSnapshot = redoResourcesSnapshotStackTrace[redoResourcesSnapshotStackTrace.length - 1];

    if(lastSnapshot.type === "add") {
      setCanvasResources(prev => [...prev, lastSnapshot.resource]);
      setConnectionLines(prev => [...prev, ...lastSnapshot.connectionLines]);
    } else {
      setCanvasResources(prev => prev.filter(r => r.id !== lastSnapshot.resource.id));
      setConnectionLines(prev => prev.filter(
        c => c.sourceId !== lastSnapshot.resource.id && c.targetId !== lastSnapshot.resource.id
      ));
    }

    setRedoResourcesSnapshotStackTrace(prev => prev.slice(0, -1));
    setCurrentLayoutSaved(false);
    setUndoResourcesSnapshotStackTrace(prev => [...prev, lastSnapshot]);
    toast.success("Redone");
  };

  const handleUndoRef = useRef(handleUndoResource);
  const handleRedoRef = useRef(handleRedoResource);

  useEffect(() => {
    handleUndoRef.current = handleUndoResource;
    handleRedoRef.current = handleRedoResource;
  });

  // Cmd/Ctrl+z + Cmd/Ctrl+Shift+z + Cmd/Ctrl+y keyboard listeners
  useEffect(() => {
    const handleKeyPressed = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA";

      if((event.ctrlKey || event.metaKey) && !isInput) {
        if(event.key.toLowerCase() === "z") {
          event.preventDefault();
          if(event.shiftKey) {
            handleRedoRef.current();
          } else {
            handleUndoRef.current();
          }
        }
        if(event.key.toLowerCase() === "y") {
          event.preventDefault();
          handleRedoRef.current();
        }
      }
    };

    window.addEventListener("keydown", handleKeyPressed);
    return () => window.removeEventListener("keydown", handleKeyPressed);
  }, []);

  /* ----------------------CONNECTION LINES BETWEEN RESOURCES ON CANVAS------------------ */
  const hanldeResouceClick = (resourceId: string, resourceType: ResourceType) => {
    if(!isConnecting) return;

    if(!selectedResource) {
      setSelectedResource(resourceId);
    }
    else if(selectedResource === resourceId) {
      setSelectedResource(null);
    }
    else {
      const alreadyConnectionLineExists = connectionLines.some(
        c => c.sourceId === selectedResource && c.targetId === resourceId
      )

      if(alreadyConnectionLineExists) {
        toast.warning("Connection already exists!");
        setSelectedResource(null);
        return;
      }

      const sourceItem = canvasResources.find(r => r.id === selectedResource);
      if(!sourceItem) return;

      const validConnection = validateConnection(sourceItem.type, resourceType);
      if(!validConnection.valid) {
        toast.warning(validConnection.message);
        setSelectedResource(null);
        return;
      }

      const port = RESOURCE_PORTS[sourceItem.type] || 80;
      
      setCurrentLayoutSaved(false);
      setConnectionLines(prev => [...prev, {
        id: `connection-${Date.now()}`,
        sourceId: selectedResource,
        targetId: resourceId,
        sourceType: sourceItem.type,
        targetType: resourceType,
        port
      }]);
      setRedoResourcesSnapshotStackTrace([]);
      setSelectedResource(null);
    }
  }

  const handleToggleConnectionLines = () => {
    setIsConnecting(!isConnecting);
    setSelectedResource(null);
  }

  /* ------------------Config panel---------------------- */
  const handleResourceDoubleClickShowConfig = (resourceId: string) => {
    setSelectedResourceForConfig(resourceId);
  }

  /* ----------------Load the sample architecture hen the canvas is empty------------ */
  const loadSampleArchitecture = () => {
    setCanvasResources(SAMPLE_ARCHITECTURE.resources);
    setConnectionLines(SAMPLE_ARCHITECTURE.connectionLines);
    setCurrentLayoutSaved(false);
    setCurrentLayoutId(null);
    setCurrentLayoutName(null);
    toast.success("Sample architecture loaded");
  };
  
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
  }, [selectedResourceForConfig]);

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
        
        if(event.over?.id === "canvas") {
          setCurrentLayoutSaved(false);
          setIsInitialized(true);

          const { active, delta } = event;
          const canvas = document.querySelector("#canvas") as HTMLElement;
          const canvasRect = canvas?.getBoundingClientRect();

          let x = 50, y = 50;
          if(canvasRect) {
            const pointerEvent = event.activatorEvent as PointerEvent;
            x = pointerEvent.clientX - canvasRect.left + delta.x - 20;
            y = pointerEvent.clientY - canvasRect.top + delta.y - 20;

            if(x < 0 || y < 0) return;
            
            const GRID_SIZE = 24;
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

          const newResource: Resource = {
            id: `${active.id}-${Date.now()}`,
            type: active.id as ResourceType,
            x,
            y
          }

          setCanvasResources(prev => [...prev, newResource]);
          setUndoResourcesSnapshotStackTrace(prev => [...prev, {
            type: "add",
            resource: newResource,
            connectionLines: [],
            savedState: currentLayoutSaved
          }]);
          setRedoResourcesSnapshotStackTrace([]);
        }
      }}
    >
      <DragOverlay>
        {activeDrag && (
          <div className="w-12 h-12 rounded-lg bg-[#12162F] border border-[#35415A] flex items-center justify-center shadow-xl opacity-90">
            <ResourceIcon type={activeDrag.label} size={24} className="text-blue-400" />
          </div>
        )}
      </DragOverlay>

      <div className="flex flex-col h-screen bg-[#0f1117] text-white">
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
          <Sidebar />

          {canvasResources.length === 0 && savedLayouts.length === 0 && !emptyCanvasStateDismissed ? (
            /* Empty state overlay */
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#12161F] border border-[#273042] flex items-center justify-center">
                  <Network className="w-8 h-8 text-gray-600" />
                </div>
                <h2 className="text-lg font-semibold text-[#EDF1F7] mb-1">
                  Design your infrastructure
                </h2>
                <p className="text-sm text-[#677185] mb-6 max-w-sm">
                  Drag resources from the sidebar, connect them, and deploy a simulated cloud architecture.
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={loadSampleArchitecture}
                    className="px-4 py-2 rounded-lg bg-[#5B8CFF] text-sm font-medium text-[#081018] hover:bg-[#7AA2FF] transition-colors duration-150"
                  >
                    Load sample architecture
                  </button>
                  <button
                    onClick={() => setEmptyCanvasStateDismissed(true)}
                    className="px-4 py-2 rounded-lg bg-[#1D2432] border border-[#273042] text-sm font-medium text-[#AAB4C5] hover:bg-[#232B3B] transition-colors duration-150"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <Canvas 
              resources={canvasResources} 
              onDeleteResource={handleDeleteCanvasResource} 
              onResourceClick={hanldeResouceClick}
              connectionLines={connectionLines}
              selectedResource={selectedResource}
              isConnecting={isConnecting}
              onResourceDoubleClick={handleResourceDoubleClickShowConfig}
            />
          )}
        </div>
      </div>

      {selectedResourceForConfig && (
        <ConfigPanelOfCanvasResource 
          resource={canvasResources.find(r => r.id === selectedResourceForConfig)}
          onClose={() => setSelectedResourceForConfig(null)}
        />
      )}

      {activeDeploymentId && (
        <DeploymentPipeline 
          deploymentId={activeDeploymentId} 
          onDeploymentPreviewClose={() => {
            setActiveDeploymentId(null);
            setIsDeploying(false);
          }}
          onDeploymentComplete={() => setIsDeploying(false)}
          onDeploymentFailed={() => setIsDeploying(false)}
        />
      )}

      {/* -------------MODAL SYSTEM Conditionally Rendered----------------*/}

      {/* 1. SAVE MODAL */}
      {modalState?.type === "save" && (
        <InputModal
          open={true}
          onOpenChange={(open) => { if (!open && !modalLoading) setModalState(null); }}
          title="Save infrastructure"
          description="Save the current canvas layout to your infrastructure list."
          submitLabel="Save"
          loading={modalLoading}
          onSubmit={async (name) => {
            setModalLoading(true);
            try {
              await handleSaveWithName(name);
              setModalState(null);
              toast.success("Infrastructure saved");
            } catch {
              toast.error("Failed to save infrastructure");
            } finally {
              setModalLoading(false);
            }
          }}
        />
      )}

      {/* 2. UPDATE MODAL */}
      {modalState?.type === "update" && (
        <InputModal
          open={true}
          onOpenChange={(open) => { if (!open && !modalLoading) setModalState(null); }}
          title="Update infrastructure"
          description="Update the saved layout with the current canvas state."
          initialValue={currentLayoutName || ""}
          submitLabel="Update"
          loading={modalLoading}
          onSubmit={async (name) => {
            setModalLoading(true);
            try {
              await handleUpdateWithName(name);
              setModalState(null);
              toast.success("Infrastructure updated");
            } catch {
              toast.error("Failed to update infrastructure");
            } finally {
              setModalLoading(false);
            }
          }}
        />
      )}

      {/* 3. CONFIRM NEW MODAL */}
      {modalState?.type === "confirm-new" && (
        <ConfirmModal
          open={true}
          onOpenChange={(open) => { if (!open && !modalLoading) setModalState(null); }}
          title={modalState.title}
          description={modalState.description}
          consequences={modalState.warnings}
          confirmLabel={modalState.confirmLabel}
          intent="danger"
          loading={modalLoading}
          onConfirm={() => {
            setModalState(null);
            handleNewExecute();
            toast.success("Canvas cleared");
          }}
        />
      )}

      {/* 4. CONFIRM DEPLOY MODAL */}
      {modalState?.type === "confirm-deploy" && (
        <ConfirmModal
          open={true}
          onOpenChange={(open) => { if (!open && !modalLoading) setModalState(null); }}
          title="Deploy infrastructure?"
          description="This will start a simulated deployment pipeline for this infrastructure."
          consequences={[]}
          metadata={`${canvasResources.length} resources · ${connectionLines.length} connections`}
          confirmLabel="Deploy"
          intent="primary"
          loading={modalLoading}
          onConfirm={async () => {
            setModalLoading(true);
            try {
              await handleDeployExecute();
              setModalState(null);
            } catch {
              toast.error("Failed to start deployment");
            } finally {
              setModalLoading(false);
            }
          }}
        />
      )}

      {/* 5. DELETE MODAL */}
      {modalState?.type === "delete" && (
        <TypeToConfirmModal
          open={true}
          onOpenChange={(open) => { if (!open && !modalLoading) setModalState(null); }}
          infrastructureName={currentLayoutName || ""}
          loading={modalLoading}
          onConfirm={async () => {
            setModalLoading(true);
            try {
              await handleDeleteExecute();
              setModalState(null);
              toast.success("Infrastructure deleted");
            } catch {
              toast.error("Failed to delete infrastructure");
            } finally {
              setModalLoading(false);
            }
          }}
        />
      )}
    </DndContext>
  )
}