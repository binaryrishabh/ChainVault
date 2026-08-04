import { type Infrastructure } from "../../Types/Infrastructure.types";
import { DropdownLayoutButton } from "./DropdownLayoutButton";
import { TopbarButton } from "./TopbarButtons";

interface TopbarProps {
  showLayoutDropdown: boolean,
  savedLayouts: Infrastructure[],
  handleOpenCloseDropDownNameClick: () => void,
  handleSelectLayout: (infrastructure: Infrastructure) => void,
  currentLayoutId: string | null,
  currentLayoutName: string | null,
  handleNew: () => void,
  handleLoad: () => void, 
  handleSave: () => void,
  handleUpdate: () => void,
  handleDelete: () => void
}

export function Topbar({ 
    showLayoutDropdown, 
    savedLayouts, 
    handleOpenCloseDropDownNameClick, 
    handleSelectLayout, 
    currentLayoutId,
    currentLayoutName, 
    handleNew, 
    handleLoad, 
    handleSave, 
    handleUpdate, 
    handleDelete 
  }: TopbarProps) {
  return (
    <div className="h-12 bg-gray-950 border-b border-gray-800 flex items-center justify-between px-4 shrink-0">
      {/* Logo */}
      <span className="text-sm font-semibold tracking-wide text-gray-200 select-none">
        ⚡ InfraForge 
        {/* Below is the dropdown button code to select particular layout */}
        { currentLayoutName && <DropdownLayoutButton
          currentLayoutName={ currentLayoutName }
          showLayoutDropdown={ showLayoutDropdown }
          savedLayouts={ savedLayouts }
          handleOpenCloseDropDownNameClick={ handleOpenCloseDropDownNameClick }
          handleSelectLayout={handleSelectLayout}
        />}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <TopbarButton icon="✨" label="new" variant="new" onclick={ handleNew } />
        {currentLayoutId ?
          <TopbarButton icon="📝" label="update" variant="update" onclick={ handleUpdate } />
          :
          <>
            <TopbarButton icon="📂" label="load" variant="load" onclick={ handleLoad } />
            <TopbarButton icon="💾" label="save" variant="save" onclick={ handleSave } />
          </>
        }
        <TopbarButton icon="X" label="delete" variant="delete" onclick={ handleDelete } />
      </div>
    </div>
  )
}