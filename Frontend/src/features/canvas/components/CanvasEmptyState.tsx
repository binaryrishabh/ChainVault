import { Network } from "lucide-react";

interface CanvasEmptyStateProps {
  onLoadSampleArchitecture: () => void;
  onDismiss: () => void;
}

export function CanvasEmptyState({
  onLoadSampleArchitecture,
  onDismiss,
}: CanvasEmptyStateProps) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#12161F] border border-[#273042] flex items-center justify-center">
          <Network className="w-8 h-8 text-gray-600" />
        </div>
        <h2 className="text-lg font-semibold text-[#EDF1F7] mb-1">
          Design your infrastructure
        </h2>
        <p className="text-sm text-[#677185] mb-6 max-w-sm">
          Drag resources from the sidebar, connect them, and deploy a
          simulated cloud architecture.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onLoadSampleArchitecture}
            className="px-4 py-2 rounded-lg bg-[#5B8CFF] text-sm font-medium text-[#081018] hover:bg-[#7AA2FF] transition-colors duration-150"
          >
            Load sample architecture
          </button>
          <button
            onClick={onDismiss}
            className="px-4 py-2 rounded-lg bg-[#1D2432] border border-[#273042] text-sm font-medium text-[#AAB4C5] hover:bg-[#232B3B] transition-colors duration-150"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}