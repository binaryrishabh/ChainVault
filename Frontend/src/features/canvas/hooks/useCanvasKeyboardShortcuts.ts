import { useEffect, type RefObject } from "react";

interface UseCanvasKeyboardShortcutsProps {
  handleUndoRef: RefObject<() => void>;
  handleRedoRef: RefObject<() => void>;
}

export function useCanvasKeyboardShortcuts({
  handleUndoRef,
  handleRedoRef,
}: UseCanvasKeyboardShortcutsProps) {
  // Cmd/Ctrl+z + Cmd/Ctrl+Shift+z + Cmd/Ctrl+y keyboard listeners
  useEffect(() => {
    const handleKeyPressed = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA";

      if ((event.ctrlKey || event.metaKey) && !isInput) {
        if (event.key.toLowerCase() === "z") {
          event.preventDefault();
          if (event.shiftKey) {
            handleRedoRef.current();
          } else {
            handleUndoRef.current();
          }
        }
        if (event.key.toLowerCase() === "y") {
          event.preventDefault();
          handleRedoRef.current();
        }
      }
    };

    window.addEventListener("keydown", handleKeyPressed);
    return () => window.removeEventListener("keydown", handleKeyPressed);
  }, []);
}