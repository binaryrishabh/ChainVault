import type { Infrastructure } from "../../Types/Infrastructure.types";

interface DropdownLayoutButtonProps {
  currentLayoutName: string | null;
  showLayoutDropdown: boolean;
  savedLayouts: Infrastructure[];
  handleOpenCloseDropDownNameClick: () => void;
  handleSelectLayout: (infrastructure: Infrastructure) => void;
}

export function DropdownLayoutButton({
    currentLayoutName,
    showLayoutDropdown,
    savedLayouts,
    handleOpenCloseDropDownNameClick,
    handleSelectLayout 
  }: DropdownLayoutButtonProps) {
  return (
    <span 
      className="relative ml-2 cursor-pointer text-blue-400 hover:text-blue-300" 
      onClick={handleOpenCloseDropDownNameClick}
    >
    - { currentLayoutName } ▾
    { showLayoutDropdown && <>
      <div className="absolute top-full left-0 mt-1 w-48 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-50 max-h-40 overflow-y-auto ">
        {savedLayouts.map((infrastructure) => {
          return <div
            key={ infrastructure.id }
            className="px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700 cursor-pointer"
            onClick={() => handleSelectLayout(infrastructure)}
          >
            { infrastructure.name }
          </div>
        })}
      </div>
    </>}
    </span>
  )
}