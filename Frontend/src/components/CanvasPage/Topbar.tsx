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
  currentLayoutSaved: boolean,
  handleNew: () => void,
  handleSave: () => void,
  handleUpdate: () => void,
  handleDeploy: () => void,
  handleDelete: () => void
}

export function Topbar({ 
    showLayoutDropdown,
    savedLayouts,
    handleOpenCloseDropDownNameClick,
    handleSelectLayout,
    currentLayoutId,
    currentLayoutName,
    currentLayoutSaved,
    handleNew,
    handleSave,
    handleUpdate,
    handleDeploy,
    handleDelete
  }: TopbarProps) {

  return (
    <div className="h-12 bg-gray-950 border-b border-gray-800 flex items-center justify-between px-4 shrink-0">
      {/* Logo */}
      <span className="text-sm font-semibold tracking-wide text-gray-200 select-none">
        ⚡ InfraForge 
        {/* Below is the dropdown button code to select particular layout */}
        { <DropdownLayoutButton
          currentLayoutId={ currentLayoutId }
          currentLayoutName={ currentLayoutName }
          showLayoutDropdown={ showLayoutDropdown }
          savedLayouts={ savedLayouts }
          handleOpenCloseDropDownNameClick={ handleOpenCloseDropDownNameClick }
          handleSelectLayout={handleSelectLayout}
        /> }
      </span>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <TopbarButton icon="✨" label="New" variant="new" onclick={  handleNew } />
        {currentLayoutId ?
          <TopbarButton icon="📝" label="Update" variant="update" onclick={ currentLayoutSaved ? undefined : handleUpdate } />
          :
          <TopbarButton icon="💾" label="Save" variant="save" onclick={ handleSave }  />
        }
        {currentLayoutId &&
          <TopbarButton  icon="🚀" label="deploy" variant="deploy" onclick={ handleDeploy } />
        }
        <TopbarButton icon="X" label="Delete Infrastructure" variant="delete" onclick={ handleDelete } />
      </div>
    </div>
  )
}