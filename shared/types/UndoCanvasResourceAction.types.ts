import type { Resource } from "./Resource.types";
import type { ConnectionLine } from "./ConnectionLine.types";

// Set the state for undo/redo of resource elements on the canvas.
export type UndoCanvasResourceAction = 
  | { type: "delete"; resource: Resource; connectionLines: ConnectionLine[]; savedState: boolean }
  | { type: "add"; resource: Resource; connectionLines: ConnectionLine[]; savedState: boolean }
